import { NextRequest, NextResponse } from "next/server";
import { fulfillRazorpayReservationPayment } from "@/lib/razorpay-fulfillment";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";

export const runtime = "nodejs";

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
      };
    };
  };
};

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature")?.trim() || "";

    if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as RazorpayWebhookPayload;
    const event = body.event || "";

    if (event !== "payment.captured" && event !== "order.paid") {
      return NextResponse.json({ received: true, skipped: event || "unknown" });
    }

    const paymentEntity = body.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id?.trim() || "";
    const paymentId = paymentEntity?.id?.trim() || "";

    if (!orderId || !paymentId) {
      return NextResponse.json({ error: "Missing payment data." }, { status: 400 });
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || req.nextUrl.origin;
    const result = await fulfillRazorpayReservationPayment({
      orderId,
      paymentId,
      origin,
    });

    if (!result.ok) {
      console.error("[razorpay webhook] fulfill failed", orderId, result.error);
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      received: true,
      reservationId: result.reservationId,
      alreadyFulfilled: result.alreadyFulfilled ?? false,
    });
  } catch (error) {
    console.error("[razorpay webhook]", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
