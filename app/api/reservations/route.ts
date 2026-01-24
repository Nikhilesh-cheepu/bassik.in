import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";

const RESERVATION_PHONE_NUMBER = "917013884485"; // India + business 10-digit

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in to make a reservation" },
        { status: 401 }
      );
    }

    // Get user info to sync to database
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
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

    // Build offers section (plain text, no emojis)
    let offersSection = "";
    if (selectedDiscounts && Array.isArray(selectedDiscounts) && selectedDiscounts.length > 0) {
      const offerList = selectedDiscounts
        .map((discountId: string) => discountNames[discountId] || discountId)
        .join("\n");
      offersSection = `\n\n${offerList}`;
    }

    // Build notes section (plain text, no emojis)
    let notesSection = "";
    if (notes && notes.trim()) {
      const notesLower = notes.toLowerCase();
      if (notesLower.includes("birthday") || notesLower.includes("bday")) {
        notesSection = "\n\nBirthday";
      } else if (notesLower.includes("anniversary")) {
        notesSection = "\n\nAnniversary";
      } else if (notesLower.includes("celebration")) {
        notesSection = "\n\nCelebration";
      } else {
        notesSection = `\n\n${notes.trim()}`;
      }
    }

    const message = `Table Reservation | ${brandName}

${fullName} | ${contactNumber}

${formatDateShort(date)} | ${formattedTime}

${guestCountStr}${offersSection}${notesSection}

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

    // Ensure user exists in database (sync from Clerk)
    // Handle case where User table might not exist yet (migration not run)
    let dbUser;
    try {
      dbUser = await prisma.user.upsert({
        where: { id: userId },
        update: {
          email: user.emailAddresses[0]?.emailAddress || "",
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          imageUrl: user.imageUrl || null,
        },
        create: {
          id: userId,
          email: user.emailAddresses[0]?.emailAddress || "",
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          imageUrl: user.imageUrl || null,
        },
      });
    } catch (error: any) {
      // If User table doesn't exist, log warning but continue (backward compatibility)
      if (error?.code === "P2021" || error?.message?.includes("does not exist")) {
        console.warn("User table not found. Please run database migration: npm run db:migrate");
        // Continue without userId - backward compatible
      } else {
        throw error;
      }
    }

    // Save to database with userId (if User table exists)
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
        userId: dbUser ? userId : null, // Link to user if User table exists
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

