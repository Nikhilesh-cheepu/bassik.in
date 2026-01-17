import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const RESERVATION_PHONE_NUMBER = "7013884485";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
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
    } = body;

    // Validate required fields
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

    // Map discount IDs to friendly names
    const discountNames: Record<string, string> = {
      "kiik-10-percent": "10% off on total bill",
      "kiik-lunch": "Lunch Special @ ₹128",
      "lunch-special": "Lunch Special @ ₹127",
      "alehouse-lunch": "Lunch Special @ ₹128",
      "alehouse-liquor": "50% off on liquor",
      "skyhy-lunch": "Lunch Special @ ₹128",
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

    // Build offers section
    let offersSection = "";
    if (selectedDiscounts && Array.isArray(selectedDiscounts) && selectedDiscounts.length > 0) {
      const offerList = selectedDiscounts
        .map((discountId: string) => {
          return discountNames[discountId] || discountId;
        })
        .map((offer: string) => `💸 ${offer}`)
        .join("\n");
      offersSection = `\n${offerList}`;
    }

    // Build notes section
    let notesSection = "";
    if (notes && notes.trim()) {
      // Check if notes contains common event types
      const notesLower = notes.toLowerCase();
      if (notesLower.includes("birthday") || notesLower.includes("bday")) {
        notesSection = "\n🎉 Birthday";
      } else if (notesLower.includes("anniversary")) {
        notesSection = "\n🎉 Anniversary";
      } else if (notesLower.includes("celebration")) {
        notesSection = "\n🎉 Celebration";
      } else {
        notesSection = `\n📝 ${notes}`;
      }
    }

    const message = `🍽️ Table Reservation | ${brandName}

👤 ${fullName} | 📞 ${contactNumber}

📅 ${formatDateShort(date)} | ⏰ ${formattedTime}

👥 ${guestCountStr}${offersSection}${notesSection}

Reservation submitted via bassik.in`;

    // Find or create venue
    let venue = await prisma.venue.findUnique({
      where: { brandId },
    });

    if (!venue) {
      // Create venue if it doesn't exist
      venue = await prisma.venue.create({
        data: {
          brandId,
          name: brandName,
          shortName: brandName,
          address: "Address to be updated",
        },
      });
    }

    // Save to database
    const reservation = await prisma.reservation.create({
      data: {
        venueId: venue.id,
        brandId,
        brandName,
        fullName,
        contactNumber,
        numberOfMen: numberOfMen || "0",
        numberOfWomen: numberOfWomen || "0",
        numberOfCouples: numberOfCouples || "0",
        date,
        timeSlot: timeSlot || time || "",
        notes: notes || null,
        selectedDiscounts: selectedDiscounts
          ? JSON.stringify(selectedDiscounts)
          : null,
        status: "PENDING",
      },
    });

    // Encode message for WhatsApp URL
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${RESERVATION_PHONE_NUMBER}?text=${encodedMessage}`;

    return NextResponse.json(
      {
        success: true,
        message: "Reservation submitted successfully",
        whatsappUrl: whatsappUrl,
        reservationId: reservation.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing reservation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

