import { NextRequest, NextResponse } from "next/server";

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

    // Map discount IDs to friendly names
    const discountNames: Record<string, string> = {
      "kiik-10-percent": "10% off on total bill",
      "kiik-lunch": "Lunch Special @ ₹128 (12PM - 8PM)",
      "lunch-special": "Lunch Special @ ₹127 (12PM - 7PM)",
      "alehouse-lunch": "Lunch Special @ ₹128 (12PM - 8PM)",
      "alehouse-liquor": "50% off on liquor (All day)",
      "skyhy-lunch": "Lunch Special @ ₹128 (12PM - 8PM)",
    };

    const timeToFormat = timeSlot || time;
    const formattedTime = timeSlot ? formatTime(timeSlot) : time;

    // Format the message for WhatsApp
    const totalGuests =
      parseInt(numberOfMen) + parseInt(numberOfWomen) + parseInt(numberOfCouples) * 2;

    // Build offers section
    let offersSection = "";
    if (selectedDiscounts && Array.isArray(selectedDiscounts) && selectedDiscounts.length > 0) {
      const offerList = selectedDiscounts
        .map((discountId: string) => {
          return discountNames[discountId] || discountId;
        })
        .join("\n   • ");
      offersSection = `\n\nSPECIAL OFFERS APPLIED:\n   • ${offerList}`;
    }

    const message = `✨ NEW TABLE RESERVATION REQUEST ✨

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VENUE: ${brandName}

CUSTOMER DETAILS:
   Name: ${fullName}
   Contact: ${contactNumber}

RESERVATION DETAILS:
   Date: ${formatDate(date)}
   Time: ${formattedTime}

GUEST COUNT:
   Men: ${numberOfMen}
   Women: ${numberOfWomen}
   Couples: ${numberOfCouples}
   Total Guests: ${totalGuests}${offersSection}${notes ? `\n\nADDITIONAL NOTES:\n   ${notes}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This reservation was submitted through the Bassik Reservations Hub.`;

    // Encode message for WhatsApp URL
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${RESERVATION_PHONE_NUMBER}?text=${encodedMessage}`;

    // Log for debugging
    console.log("Reservation Details:", {
      phone: RESERVATION_PHONE_NUMBER,
      message,
      whatsappUrl,
      reservationData: body,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Reservation submitted successfully",
        whatsappUrl: whatsappUrl,
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

