import { NextRequest, NextResponse } from "next/server";
import { fulfillRazorpayReservationPayment } from "@/lib/razorpay-fulfillment";
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

    const result = await fulfillRazorpayReservationPayment({
      orderId,
      paymentId,
      origin: req.nextUrl.origin,
      cookie: req.headers.get("cookie") || "",
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      reservationId: result.reservationId,
    });
  } catch (error) {
    console.error("[razorpay verify]", error);
    return NextResponse.json({ error: "Could not confirm booking." }, { status: 500 });
  }
}
