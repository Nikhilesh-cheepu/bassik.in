import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isClubRogueBrand } from "@/lib/club-rogue";
import {
  clubRogueReservationFeePaise,
  getRazorpayClient,
  getRazorpayPublicKeyId,
  isRazorpayConfigured,
} from "@/lib/razorpay";
import { isEventSlotInPast } from "@/lib/event-booking-slots";

function normalizePhone(raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length > 10 && (digits.startsWith("91") || digits.startsWith("0"))) {
    return digits.replace(/^(91|0)+/, "").slice(0, 10);
  }
  return digits.slice(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const brandId = typeof body.brandId === "string" ? body.brandId.trim() : "";
    if (!isClubRogueBrand(brandId)) {
      return NextResponse.json({ error: "Invalid venue" }, { status: 400 });
    }

    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const contactNumber = normalizePhone(body.contactNumber);
    const date = typeof body.date === "string" ? body.date.trim() : "";
    const timeSlot = typeof body.timeSlot === "string" ? body.timeSlot.trim() : "";
    const numberOfMen = String(body.numberOfMen ?? "1");
    const coverChargeAcknowledged = body.coverChargeAcknowledged === true;

    if (!fullName || !/^\d{10}$/.test(contactNumber) || !date || !timeSlot) {
      return NextResponse.json({ error: "Please fill all required fields." }, { status: 400 });
    }
    if (isEventSlotInPast(date, timeSlot)) {
      return NextResponse.json({ error: "Please choose a future time slot." }, { status: 400 });
    }
    if (!coverChargeAcknowledged) {
      return NextResponse.json(
        { error: "Please acknowledge the ₹2,000 cover charge." },
        { status: 400 }
      );
    }

    const guests = Math.max(1, Math.min(20, parseInt(numberOfMen, 10) || 1));

    const bookingDraft = {
      ...body,
      fullName,
      contactNumber,
      date,
      timeSlot,
      numberOfMen,
      numberOfWomen: String(body.numberOfWomen ?? "0"),
      numberOfCouples: String(body.numberOfCouples ?? "0"),
      brandId,
      brandName: typeof body.brandName === "string" ? body.brandName : brandId,
      coverChargeAcknowledged: true,
      selectedDiscounts: [],
      notes:
        typeof body.notes === "string" && body.notes.trim()
          ? body.notes.trim()
          : "Club Rogue online reservation",
    };

    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        {
          error:
            "Online payment is not set up yet. Bookings cannot be confirmed until Razorpay is connected.",
          code: "PAYMENT_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    const amountPaise = clubRogueReservationFeePaise(guests);
    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `cr_${Date.now().toString(36)}`.slice(0, 40),
      notes: { brandId, phone: contactNumber },
    });

    await prisma.reservationPayment.create({
      data: {
        brandId,
        razorpayOrderId: order.id,
        amountPaise,
        status: "CREATED",
        bookingDraft,
      },
    });

    return NextResponse.json({
      skipPayment: false,
      keyId: getRazorpayPublicKeyId(),
      orderId: order.id,
      amountPaise,
      amountInr: amountPaise / 100,
      currency: "INR",
      prefill: { name: fullName, contact: contactNumber },
    });
  } catch (error) {
    console.error("[razorpay create-order]", error);
    return NextResponse.json({ error: "Could not start payment. Try again." }, { status: 500 });
  }
}
