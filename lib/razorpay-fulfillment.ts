import { prisma } from "@/lib/db";

export type RazorpayFulfillResult =
  | { ok: true; reservationId: string | null; alreadyFulfilled?: boolean }
  | { ok: false; error: string; status: number };

/** Mark order paid and create reservation — shared by client verify + webhook. */
export async function fulfillRazorpayReservationPayment(params: {
  orderId: string;
  paymentId: string;
  origin: string;
  cookie?: string;
}): Promise<RazorpayFulfillResult> {
  const { orderId, paymentId, origin, cookie } = params;

  const payment = await prisma.reservationPayment.findUnique({
    where: { razorpayOrderId: orderId },
  });
  if (!payment) {
    return { ok: false, error: "Payment record not found.", status: 404 };
  }
  if (payment.status === "PAID" && payment.reservationId) {
    return { ok: true, reservationId: payment.reservationId, alreadyFulfilled: true };
  }

  await prisma.reservationPayment.update({
    where: { id: payment.id },
    data: {
      status: "PAID",
      razorpayPaymentId: paymentId,
    },
  });

  const bookingDraft = payment.bookingDraft as Record<string, unknown>;
  const reservationRes = await fetch(`${origin}/api/reservations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: cookie || "",
    },
    body: JSON.stringify({
      ...bookingDraft,
      clubRoguePaymentOrderId: orderId,
    }),
  });
  const reservationData = await reservationRes.json().catch(() => ({}));
  if (!reservationRes.ok) {
    return {
      ok: false,
      error:
        (typeof reservationData.error === "string" && reservationData.error) ||
        "Booking failed after payment. Contact support.",
      status: 502,
    };
  }

  const reservationId =
    typeof reservationData.reservationId === "string" ? reservationData.reservationId : null;

  await prisma.reservationPayment.update({
    where: { id: payment.id },
    data: { reservationId },
  });

  return { ok: true, reservationId };
}
