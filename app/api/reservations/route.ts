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

    // Format the message for WhatsApp/SMS
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

---
Sent from Bassik Reservations Hub`;

    // In a production environment, you would:
    // 1. Send this via WhatsApp Business API
    // 2. Send via SMS API (Twilio, etc.)
    // 3. Store in a database
    // 4. Send email notification

    // For now, we'll just log it and return success
    // You can integrate with your preferred messaging service here
    console.log("Reservation Details:", {
      phone: RESERVATION_PHONE_NUMBER,
      message,
      reservationData: body,
    });

    // TODO: Integrate with actual messaging service
    // Example with WhatsApp Business API or Twilio:
    // await sendWhatsAppMessage(RESERVATION_PHONE_NUMBER, message);
    // or
    // await sendSMS(RESERVATION_PHONE_NUMBER, message);

    return NextResponse.json(
      {
        success: true,
        message: "Reservation submitted successfully",
        // In production, you might want to return a reservation ID
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

