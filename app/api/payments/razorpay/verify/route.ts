import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyRazorpayPaymentSignature } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderId = typeof body.razorpay_order_id === "string" ? body.razorpay_order_id.trim() : "";
    const paymentId = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id.trim() : "";
    const signature = typeof body.razorpay_signature === "string" ? body.razorpay_signature.trim() : "";

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: "Invalid payment response." }, { status: 400 });
    }

    if (!verifyRazorpayPaymentSignature({ orderId, paymentId, signature })) {
      return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
    }

    const payment = await prisma.reservationPayment.findUnique({
      where: { razorpayOrderId: orderId },
    });
    if (!payment) {
      return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
    }
    if (payment.status === "PAID" && payment.reservationId) {
      return NextResponse.json({ success: true, reservationId: payment.reservationId });
    }

    await prisma.reservationPayment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        razorpayPaymentId: paymentId,
      },
    });

    const bookingDraft = payment.bookingDraft as Record<string, unknown>;
    const origin = req.nextUrl.origin;
    const reservationRes = await fetch(`${origin}/api/reservations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        ...bookingDraft,
        clubRoguePaymentOrderId: orderId,
      }),
    });
    const reservationData = await reservationRes.json().catch(() => ({}));
    if (!reservationRes.ok) {
      return NextResponse.json(
        { error: reservationData.error || "Booking failed after payment. Contact support." },
        { status: 502 }
      );
    }

    const reservationId =
      typeof reservationData.reservationId === "string" ? reservationData.reservationId : null;

    await prisma.reservationPayment.update({
      where: { id: payment.id },
      data: { reservationId },
    });

    return NextResponse.json({
      success: true,
      reservationId: reservationData.reservationId,
    });
  } catch (error) {
    console.error("[razorpay verify]", error);
    return NextResponse.json({ error: "Could not confirm booking." }, { status: 500 });
  }
}
