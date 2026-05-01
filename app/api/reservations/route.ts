import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDiscountLabel } from "@/lib/reservation-discounts";
import { getOutletLabelForReservation } from "@/lib/brands";
import {
  CLUB_ROGUE_GACHIBOWLI_ID,
  isClubRogueBrand,
} from "@/lib/club-rogue";

export const runtime = "nodejs";

function normalizeIndianMobile10(raw: string): string {
  const digitsOnly = String(raw || "").replace(/\D/g, "");
  const normalized =
    digitsOnly.length > 10 && (digitsOnly.startsWith("91") || digitsOnly.startsWith("0"))
      ? digitsOnly.replace(/^(91|0)+/, "").slice(0, 10)
      : digitsOnly.slice(0, 10);
  return normalized;
}

async function sendInteraktTemplateMessage(params: {
  apiKey: string;
  phoneNumber10: string;
  callbackData: string;
  templateName: string;
  languageCode: string;
  bodyValues: string[];
  logLabel: string;
}): Promise<{ ok: true } | { ok: false; status: number; text: string }> {
  const payload = {
    countryCode: "+91",
    phoneNumber: params.phoneNumber10,
    type: "Template",
    callbackData: params.callbackData,
    template: {
      name: params.templateName,
      languageCode: params.languageCode,
      bodyValues: params.bodyValues,
    },
  };

  const resp = await fetch("https://api.interakt.ai/v1/public/message/", {
    method: "POST",
    headers: {
      Authorization: `Basic ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    console.error(
      `[INTERAKT ${params.logLabel}] Non-2xx response:`,
      resp.status,
      text.slice(0, 500)
    );
    return { ok: false, status: resp.status, text };
  }

  await resp.json().catch(() => null);
  return { ok: true };
}

export async function POST(request: NextRequest) {
  try {
    console.log("[RESERVATION API] Starting reservation request");

    // Reservations no longer depend on server-side auth; middleware + frontend protect the flow.
    const userId: string | null = null;

    let body;
    try {
      body = await request.json();
      console.log("[RESERVATION API] Request body received:", { 
        brandId: body.brandId, 
        hasDate: !!body.date,
        hasTimeSlot: !!body.timeSlot,
      });
    } catch (parseError: any) {
      console.error("[RESERVATION API] Error parsing request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }
    let {
      fullName,
      contactNumber,
      numberOfMen,
      numberOfWomen,
      numberOfCouples,
      date,
      time,
      timeSlot,
      notes,
      selectedDiscounts,
      eventId,
      eventName,
      brandId,
      brandName,
      hubSpotId,
      coverChargeAcknowledged,
      bookingNightGenre,
    } = body;

    // Normalize to 10-digit Indian number (strip +91, 91, 0 prefix)
    contactNumber = normalizeIndianMobile10(String(contactNumber || ""));

    const valid10Digit = /^\d{10}$/.test(contactNumber);

    const normalizedFullName = String(fullName || "").trim();

    if (
      !normalizedFullName ||
      !contactNumber ||
      numberOfMen === undefined ||
      numberOfWomen === undefined ||
      numberOfCouples === undefined ||
      !date ||
      (!time && !timeSlot) ||
      !brandId
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    if (!valid10Digit) {
      return NextResponse.json(
        { error: "Please provide a valid 10-digit contact number." },
        { status: 400 }
      );
    }

    const userNotesTrimmed =
      notes && String(notes).trim() ? String(notes).trim() : "";

    let notesSectionFromUser = "";
    if (userNotesTrimmed) {
      const notesLower = userNotesTrimmed.toLowerCase();
      if (notesLower.includes("birthday") || notesLower.includes("bday")) {
        notesSectionFromUser = "Birthday";
      } else if (notesLower.includes("anniversary")) {
        notesSectionFromUser = "Anniversary";
      } else if (notesLower.includes("celebration")) {
        notesSectionFromUser = "Celebration";
      } else {
        notesSectionFromUser = userNotesTrimmed;
      }
    }

    // Format date nicely
    const formatDate = (dateStr: string): string => {
      const date = new Date(dateStr);
      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      return date.toLocaleDateString("en-IN", options);
    };

    // Format time from 24-hour to 12-hour format
    const formatTime = (time24: string): string => {
      if (!time24) return "";
      const [hours, minutes] = time24.split(":").map(Number);
      const period = hours >= 12 ? "PM" : "AM";
      const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
    };

    // Format date in short format (e.g., "18 Jan 2026")
    const formatDateShort = (dateStr: string): string => {
      const date = new Date(dateStr);
      const options: Intl.DateTimeFormatOptions = {
        day: "numeric",
        month: "short",
        year: "numeric",
      };
      return date.toLocaleDateString("en-IN", options);
    };

    const timeToFormat = timeSlot || time;

    const totalGuests =
      parseInt(numberOfMen) + parseInt(numberOfWomen) + parseInt(numberOfCouples) * 2;

    const dateShort = formatDateShort(date);
    const timeLabel = timeToFormat ? formatTime(timeToFormat) : "";

    // Store reservation under `the-hub` when that outlet is selected.
    // (Booking destination/outlet name for messaging can still be the selected hub sub-outlet.)
    const effectiveBrandIdForBooking = brandId;

    // Use the selected hub sub-outlet for offer labels (if any were provided).
    const effectiveBrandIdForOffers =
      brandId === "the-hub" && hubSpotId && typeof hubSpotId === "string" ? hubSpotId : brandId;

    const venue = await prisma.venue.findUnique({
      where: { brandId: effectiveBrandIdForBooking },
      select: { id: true, name: true, shortName: true },
    });

    if (!venue) {
      return NextResponse.json({ error: "Unknown outlet" }, { status: 400 });
    }

    if (isClubRogueBrand(brandId)) {
      if (coverChargeAcknowledged !== true) {
        return NextResponse.json(
          {
            error:
              "Please acknowledge the ₹2,000 mandatory cover charge (fully redeemable at the venue) to continue.",
          },
          { status: 400 }
        );
      }
    }

    let nightGenre: "tollywood" | "bollywood" | null = null;
    if (brandId === CLUB_ROGUE_GACHIBOWLI_ID) {
      const raw =
        typeof bookingNightGenre === "string"
          ? bookingNightGenre.toLowerCase().trim()
          : "";
      if (raw !== "tollywood" && raw !== "bollywood") {
        return NextResponse.json(
          { error: "Please select Tollywood night or Bollywood night." },
          { status: 400 }
        );
      }
      nightGenre = raw;
    }

    const outletDisplayName = getOutletLabelForReservation(
      brandId,
      hubSpotId,
      brandName,
      venue.name,
      venue.shortName
    );
    const outletNameForTemplate = outletDisplayName;
    const brandLabelForBooking = outletDisplayName;

    // Resolve discount labels (prefer static mapping so text is consistent)
    const discountLabels: string[] = [];
    if (Array.isArray(selectedDiscounts) && selectedDiscounts.length > 0) {
      for (const d of selectedDiscounts) {
        let label: string | null = null;

        if (typeof d === "string") {
          // Treat as discount id first
          label = getDiscountLabel(effectiveBrandIdForOffers, d) || d;
        } else if (d && typeof d === "object") {
          if (d.id && typeof d.id === "string") {
            label = getDiscountLabel(effectiveBrandIdForOffers, d.id) || null;
          }
          if (!label) {
            label =
              (typeof d.title === "string" && d.title) ||
              (typeof d.label === "string" && d.label) ||
              (typeof d.name === "string" && d.name) ||
              (typeof d.id === "string" && d.id) ||
              null;
          }
        }

        if (label) discountLabels.push(label);
      }
    }

    const offerText =
      discountLabels.length > 0 ? discountLabels.join(" / ") : "NA";

    // 1) Save booking (venue row loaded above)
    const timeSlotNormalized = String(timeToFormat);
    const menNormalized = String(numberOfMen);
    const womenNormalized = String(numberOfWomen);
    const couplesNormalized = String(numberOfCouples);
    const eventIdNormalized = typeof eventId === "string" && eventId.trim() ? eventId.trim() : null;
    const isEventBooking = Boolean(eventIdNormalized);
    const dbNotesParts: string[] = [];
    if (brandId === CLUB_ROGUE_GACHIBOWLI_ID && nightGenre) {
      dbNotesParts.push(nightGenre === "tollywood" ? "Tollywood night" : "Bollywood night");
    }
    if (userNotesTrimmed) dbNotesParts.push(userNotesTrimmed);
    const notesNormalized =
      [
        dbNotesParts.length > 0 ? dbNotesParts.join("\n") : "",
        eventIdNormalized ? `[event:${eventIdNormalized}]` : "",
      ]
        .filter(Boolean)
        .join("\n")
        .trim() || null;
    let eventNameForTemplate = "Event";
    let eventDateForTemplate = dateShort;
    if (typeof eventName === "string" && eventName.trim()) {
      eventNameForTemplate = eventName.trim();
    }
    if (eventIdNormalized && date) {
      eventDateForTemplate = formatDateShort(String(date));
    }
    const selectedDiscountsNormalized =
      Array.isArray(selectedDiscounts) && selectedDiscounts.length > 0
        ? JSON.stringify(
            [...selectedDiscounts]
              .map((x) => (typeof x === "string" ? x : ""))
              .filter(Boolean)
              .sort()
          )
        : null;

    // Avoid duplicate Interakt sends on quick retries:
    // If the same booking (same outlet+time+customer+phone+guest counts) exists very recently, treat as idempotent.
    const recently = new Date(Date.now() - 30 * 1000); // 30s window to avoid duplicate sends on quick retries
    const existingReservation = await prisma.reservation.findFirst({
      where: {
        brandId: effectiveBrandIdForBooking,
        date,
        timeSlot: timeSlotNormalized,
        contactNumber,
        fullName: normalizedFullName,
        numberOfMen: menNormalized,
        numberOfWomen: womenNormalized,
        numberOfCouples: couplesNormalized,
        notes: notesNormalized,
        selectedDiscounts: selectedDiscountsNormalized,
        status: "CONFIRMED",
        createdAt: { gte: recently },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    });

    const createdReservation = existingReservation
      ? null
      : await prisma.reservation.create({
          data: {
            venueId: venue.id,
            brandId: effectiveBrandIdForBooking,
            brandName: brandLabelForBooking,
            fullName: normalizedFullName,
            contactNumber,
            numberOfMen: menNormalized,
            numberOfWomen: womenNormalized,
            numberOfCouples: couplesNormalized,
            date,
            timeSlot: timeSlotNormalized,
            notes: notesNormalized,
            selectedDiscounts: selectedDiscountsNormalized,
            status: "CONFIRMED",
            userId,
          },
          select: { id: true },
        });
    const reservationId = existingReservation?.id ?? createdReservation?.id;
    if (!reservationId) {
      return NextResponse.json(
        { error: "Failed to create reservation. Please try again." },
        { status: 500 }
      );
    }

    const shouldTriggerInterakt = !existingReservation;

    // 2) Trigger WhatsApp silently in background (do not block UI)
    const interaktApiKey = process.env.INTERAKT_API_KEY?.trim();
    const defaultTemplateName = process.env.INTERAKT_BOOKING_TEMPLATE_NAME?.trim() || "bassik_website";
    const defaultLanguageCode = process.env.INTERAKT_BOOKING_TEMPLATE_LANGUAGE_CODE?.trim() || "en";
    const eventTemplateName = process.env.INTERAKT_EVENT_TEMPLATE_NAME?.trim() || "bassik_website_events";
    const eventLanguageCode = process.env.INTERAKT_EVENT_TEMPLATE_LANGUAGE_CODE?.trim() || "en";
    const interaktTemplateName = isEventBooking ? eventTemplateName : defaultTemplateName;
    const interaktLanguageCode = isEventBooking ? eventLanguageCode : defaultLanguageCode;

    const staffNotifyRaw = process.env.INTERAKT_STAFF_NOTIFY_PHONE?.trim() ?? "";
    const staffNotifyPhone10 = normalizeIndianMobile10(staffNotifyRaw);
    const staffNotifyEnabled =
      Boolean(staffNotifyRaw) &&
      /^\d{10}$/.test(staffNotifyPhone10) &&
      staffNotifyPhone10 !== contactNumber;
    const defaultStaffBookingTemplateName = "bassik_website_outlet";
    const staffBookingTemplateName =
      process.env.INTERAKT_STAFF_BOOKING_TEMPLATE_NAME?.trim() || defaultStaffBookingTemplateName;
    const staffBookingLanguageCode =
      process.env.INTERAKT_STAFF_BOOKING_TEMPLATE_LANGUAGE_CODE?.trim() || defaultLanguageCode;
    const defaultStaffEventTemplateName = "bassik_events_outlet";
    const staffEventTemplateName =
      process.env.INTERAKT_STAFF_EVENT_TEMPLATE_NAME?.trim() || defaultStaffEventTemplateName;
    const staffEventLanguageCode =
      process.env.INTERAKT_STAFF_EVENT_TEMPLATE_LANGUAGE_CODE?.trim() || eventLanguageCode;
    const staffTemplateName = isEventBooking ? staffEventTemplateName : staffBookingTemplateName;
    const staffLanguageCode = isEventBooking ? staffEventLanguageCode : staffBookingLanguageCode;

    const genreLabelForNotes =
      brandId === CLUB_ROGUE_GACHIBOWLI_ID && nightGenre
        ? nightGenre === "tollywood"
          ? "Tollywood"
          : "Bollywood"
        : "";
    const notesBodyForTemplate =
      notesSectionFromUser || userNotesTrimmed || "";
    const noteValue =
      [genreLabelForNotes, notesBodyForTemplate].filter(Boolean).join(" · ") || "-";

    if (!shouldTriggerInterakt) {
      console.log("[RESERVATION API] Duplicate booking detected; skipping WhatsApp trigger.");
    } else if (!interaktApiKey) {
      // Caller explicitly wants confirmation only after WhatsApp API is sent.
      return NextResponse.json(
        { error: "WhatsApp service is not configured. Please try again shortly." },
        { status: 503 }
      );
    } else {
      const bodyValues = isEventBooking
        ? [
            outletNameForTemplate, // {{1}}
            normalizedFullName, // {{2}}
            contactNumber, // {{3}}
            eventNameForTemplate, // {{4}}
            eventDateForTemplate, // {{5}}
            timeLabel, // {{6}}
            String(totalGuests), // {{7}}
            "CONFIRMED", // {{8}}
          ]
        : [
            outletNameForTemplate, // {{1}}
            normalizedFullName, // {{2}}
            contactNumber, // {{3}}
            dateShort, // {{4}}
            timeLabel, // {{5}}
            noteValue, // {{6}}
            offerText, // {{7}}
            String(totalGuests), // {{8}}
            "CONFIRMED", // {{9}}
          ];
      const customerSend = await sendInteraktTemplateMessage({
        apiKey: interaktApiKey,
        phoneNumber10: contactNumber,
        callbackData: reservationId,
        templateName: interaktTemplateName,
        languageCode: interaktLanguageCode,
        bodyValues,
        logLabel: "booking-customer",
      });

      if (!customerSend.ok) {
        return NextResponse.json(
          { error: "Unable to send WhatsApp confirmation. Please try again." },
          { status: 502 }
        );
      }

      if (staffNotifyEnabled) {
        const staffSend = await sendInteraktTemplateMessage({
          apiKey: interaktApiKey,
          phoneNumber10: staffNotifyPhone10,
          callbackData: `${reservationId}-staff`,
          templateName: staffTemplateName,
          languageCode: staffLanguageCode,
          bodyValues,
          logLabel: "booking-staff",
        });

        if (!staffSend.ok) {
          // Customer message already succeeded; staff is secondary — log and continue.
          console.error(
            "[INTERAKT booking-staff] Staff notify failed after customer OK:",
            staffSend.status,
            staffSend.text?.slice?.(0, 500)
          );
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Reservation submitted successfully",
        reservationId,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[RESERVATION API] Top-level error caught:", error);
    
    // Provide more detailed error information for debugging
    const errorMessage = error?.message || "Internal server error";
    const errorCode = error?.code || "UNKNOWN";
    
    // Log full error details (always log - helps with debugging)
    console.error("[RESERVATION API] Full error details:", {
      message: errorMessage,
      code: errorCode,
      meta: error?.meta,
      name: error?.name,
      stack: error?.stack?.split('\n').slice(0, 5).join('\n'), // First 5 lines of stack
    });

    return NextResponse.json(
      {
        error: "Failed to process reservation. Please try again.",
        details: errorMessage,
        code: errorCode,
      },
      { status: 500 }
    );
  }
}

