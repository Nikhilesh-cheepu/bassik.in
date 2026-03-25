import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getContactForBrand, getFullPhoneNumber } from "@/lib/outlet-contacts";
import { getDiscountLabel } from "@/lib/reservation-discounts";

export async function POST(request: NextRequest) {
  // Fallback WhatsApp URL that we can still return even if DB calls fail.
  let fallbackWhatsappUrl: string | null = null;
  try {
    console.log("[RESERVATION API] Starting reservation request");

    // Reservations no longer depend on server-side auth; middleware + frontend protect the flow.
    const userId: string | null = null;
    const user: any = null;

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

    if (
      !fullName ||
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
    const formattedTime = timeSlot ? formatTime(timeSlot) : time;

    // Format the message for WhatsApp
    const totalGuests =
      parseInt(numberOfMen) + parseInt(numberOfWomen) + parseInt(numberOfCouples) * 2;

    // Build guest count string
    const guestParts: string[] = [];
    if (parseInt(numberOfMen) > 0) guestParts.push(`${numberOfMen}M`);
    if (parseInt(numberOfWomen) > 0) guestParts.push(`${numberOfWomen}W`);
    if (parseInt(numberOfCouples) > 0) guestParts.push(`${numberOfCouples} Couple${parseInt(numberOfCouples) > 1 ? "s" : ""}`);
    const guestCountStr = `${totalGuests} Guests (${guestParts.join(" / ")})`;

    // Build notes section (plain text, no emojis)
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

    // Build WhatsApp URL from the same contact number the outlet page uses.
    // The outlet page prefers `Venue.contactNumbers[0]` (DB override) and falls back to static defaults.
    const effectiveBrandId =
      brandId === "the-hub" && hubSpotId && typeof hubSpotId === "string" ? hubSpotId : brandId;

    const dateShort = formatDateShort(date);
    const timeLabel = timeToFormat ? formatTime(timeToFormat) : "";
    const brandLabel = brandName || (brandId === "skyhy" ? "SkyHy" : brandId);

    // Resolve discount labels (prefer static mapping so text is consistent)
    const discountLabels: string[] = [];
    if (Array.isArray(selectedDiscounts) && selectedDiscounts.length > 0) {
      for (const d of selectedDiscounts) {
        let label: string | null = null;

        if (typeof d === "string") {
          // Treat as discount id first
          label = getDiscountLabel(effectiveBrandId, d) || d;
        } else if (d && typeof d === "object") {
          if (d.id && typeof d.id === "string") {
            label = getDiscountLabel(effectiveBrandId, d.id) || null;
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

    // Build WhatsApp message text in required format
    const messageLines: string[] = [];
    messageLines.push(`🌃 ${brandLabel}`);
    messageLines.push("");
    messageLines.push(`👤 Name: ${fullName}`);
    messageLines.push(`📱 Mobile number: ${contactNumber}`);
    messageLines.push(`📅 Date: ${dateShort}`);
    messageLines.push(`⏰ Time: ${timeLabel}`);
    messageLines.push(`👥 Total pax: ${totalGuests}`);
    messageLines.push(`🎁 Offer / Discount: ${offerText}`);
    if (notesSection) {
      messageLines.push(`📝 Notes: ${notesSection}`);
    }
    messageLines.push("");
    messageLines.push("Booking status:");
    messageLines.push("✅ CONFIRMED");
    messageLines.push("");
    messageLines.push("Bassik.in");

    const message = messageLines.join("\n");

    // Prefer DB contactNumbers (matches outlet CTA). If missing, fall back to static mapping.
    const venue = await prisma.venue.findUnique({
      where: { brandId: effectiveBrandId },
      select: { contactPhone: true, contactNumbers: true },
    });

    const rawContacts = venue?.contactNumbers as unknown;
    const dbContacts: { phone?: unknown; label?: unknown }[] = Array.isArray(rawContacts) ? rawContacts as any : [];

    const dbPhoneCandidate =
      dbContacts
        .map((c) => (c && typeof c === "object" ? (c as any).phone : null))
        .find((p) => typeof p === "string" && p.trim()) || null;

    const phone = (dbPhoneCandidate as string | null) ?? venue?.contactPhone ?? getContactForBrand(effectiveBrandId);
    const waNumber = getFullPhoneNumber(phone || getContactForBrand(effectiveBrandId));
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${waNumber}?text=${encodedMessage}`;

    console.log("[RESERVATION API] WhatsApp-only mode, returning URL:", whatsappUrl);
    return NextResponse.json(
      {
        success: true,
        message: "Reservation submitted successfully",
        whatsappUrl,
        reservationId: null,
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
        error: "Failed to process reservation. Please try again or use the WhatsApp button on the outlet page.",
        details: errorMessage,
        code: errorCode,
      },
      { status: 500 }
    );
  }
}

