import Razorpay from "razorpay";
import crypto from "crypto";
import {
  clubRogueReservationFeePaiseForGuests,
} from "@/lib/club-rogue-fees";
import { isClubRogueBrand } from "@/lib/club-rogue";

export function getRazorpayPublicKeyId(): string {
  return (
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() ||
    process.env.RAZORPAY_KEY_ID?.trim() ||
    ""
  );
}

export function isRazorpayConfigured(): boolean {
  return Boolean(getRazorpayPublicKeyId() && process.env.RAZORPAY_KEY_SECRET?.trim());
}

export function getRazorpayClient(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID?.trim();
  const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!key_id || !key_secret) {
    throw new Error("Razorpay is not configured");
  }
  return new Razorpay({ key_id, key_secret });
}

export function clubRogueReservationFeePaise(guestCount = 1): number {
  return clubRogueReservationFeePaiseForGuests(guestCount);
}

export function verifyRazorpayPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");
  return expected === params.signature;
}

/** Razorpay dashboard webhook — verify `x-razorpay-signature` against raw body. */
export function verifyRazorpayWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected === signature;
}

export function razorpayEnabledForBrand(brandId: string): boolean {
  return isClubRogueBrand(brandId) && isRazorpayConfigured();
}

/** Club Rogue Meta landing: block free confirmations unless explicitly allowed (local dev). */
export function clubRogueBookingRequiresPayment(): boolean {
  return process.env.CLUB_ROGUE_ALLOW_BOOK_WITHOUT_PAYMENT?.trim() !== "true";
}
