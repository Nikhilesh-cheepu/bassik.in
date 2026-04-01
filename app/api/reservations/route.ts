import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDiscountLabel } from "@/lib/reservation-discounts";

export const runtime = "nodejs";

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
    } = body;

    // Normalize to 10-digit Indian number (strip +91, 91, 0 prefix)
    const digitsOnly = String(contactNumber || "").replace(/\D/g, "");
    const normalized =
      digitsOnly.length > 10 && (digitsOnly.startsWith("91") || digitsOnly.startsWith("0"))
        ? digitsOnly.replace(/^(91|0)+/, "").slice(0, 10)
        : digitsOnly.slice(0, 10);
    contactNumber = normalized;

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

    let notesSection = "";
    if (notes && notes.trim()) {
      const notesLower = notes.toLowerCase();
      if (notesLower.includes("birthday") || notesLower.includes("bday")) {
        notesSection = "Birthday";
      } else if (notesLower.includes("anniversary")) {
        notesSection = "Anniversary";
      } else if (notesLower.includes("celebration")) {
        notesSection = "Celebration";
      } else {
        notesSection = notes.trim();
      }
    }

    const dateShort = formatDateShort(date);
    const timeLabel = timeToFormat ? formatTime(timeToFormat) : "";

    // Store reservation under `the-hub` when that outlet is selected.
    // (Booking destination/outlet name for messaging can still be the selected hub sub-outlet.)
    const effectiveBrandIdForBooking = brandId;

    // Use the selected hub sub-outlet for offer labels (if any were provided).
    const effectiveBrandIdForOffers =
      brandId === "the-hub" && hubSpotId && typeof hubSpotId === "string" ? hubSpotId : brandId;

    const outletNameForTemplate =
      brandId === "the-hub" && hubSpotId && typeof hubSpotId === "string"
        ? hubSpotId === "c53"
          ? "C53"
          : hubSpotId === "boiler-room"
            ? "Boiler Room"
            : hubSpotId === "firefly"
              ? "Firefly"
              : brandName || "The Hub"
        : brandName || (brandId === "skyhy" ? "SkyHy" : brandId);

    const brandLabelForBooking = brandName || (brandId === "skyhy" ? "SkyHy" : brandId);

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

    // 1) Save booking first
    const venue = await prisma.venue.findUnique({
      where: { brandId: effectiveBrandIdForBooking },
      select: { id: true },
    });

    if (!venue) {
      return NextResponse.json({ error: "Unknown outlet" }, { status: 400 });
    }

    const timeSlotNormalized = String(timeToFormat);
    const menNormalized = String(numberOfMen);
    const womenNormalized = String(numberOfWomen);
    const couplesNormalized = String(numberOfCouples);
    const baseNotes = notes && String(notes).trim() ? String(notes).trim() : "";
    const eventIdNormalized = typeof eventId === "string" && eventId.trim() ? eventId.trim() : null;
    const isEventBooking = Boolean(eventIdNormalized);
    const notesNormalized = [baseNotes, eventIdNormalized ? `[event:${eventIdNormalized}]` : ""]
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

    const noteValue = notesSection || (notes && String(notes).trim() ? String(notes).trim() : "-");

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
      const payload = {
        countryCode: "+91",
        phoneNumber: contactNumber,
        type: "Template",
        callbackData: reservationId,
        template: {
          name: interaktTemplateName,
          languageCode: interaktLanguageCode,
          bodyValues,
        },
      };

      const resp = await fetch("https://api.interakt.ai/v1/public/message/", {
        method: "POST",
        headers: {
          Authorization: `Basic ${interaktApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        console.error("[INTERAKT booking] Non-2xx response:", resp.status, text.slice(0, 500));
        return NextResponse.json(
          { error: "Unable to send WhatsApp confirmation. Please try again." },
          { status: 502 }
        );
      }

      // Ensure provider accepted payload before confirming UI.
      await resp.json().catch(() => null);
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

