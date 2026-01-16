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
      !time ||
      !brandId
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Format the message for WhatsApp
    const totalGuests =
      parseInt(numberOfMen) + parseInt(numberOfWomen) + parseInt(numberOfCouples) * 2;

    const message = `🎉 New Reservation Request

📍 Venue: ${brandName}
👤 Name: ${fullName}
📞 Contact: ${contactNumber}
📅 Date: ${date}
⏰ Time: ${time}

👥 Guest Details:
   • Men: ${numberOfMen}
   • Women: ${numberOfWomen}
   • Couples: ${numberOfCouples}
   • Total Guests: ${totalGuests}

${notes ? `📝 Notes: ${notes}` : ""}

${selectedDiscounts && Array.isArray(selectedDiscounts) && selectedDiscounts.length > 0 ? `🎁 Selected Offers:\n${selectedDiscounts.map((discount: string) => `   • ${discount}`).join('\n')}\n` : ""}
---
Sent from Bassik Reservations Hub`;

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

