/**
 * Club Rogue table confirmation — customer pays ₹50 all-in.
 * Razorpay: 2% + 18% GST on that fee (~₹1.18 on ₹50). Never shown to guests.
 */

export const CLUB_ROGUE_CONFIRMATION_FEE_INR = 41;
export const CLUB_ROGUE_SERVICE_GST_PERCENT = 18;
export const CLUB_ROGUE_RESERVATION_FEE_INR = 50;
export const CLUB_ROGUE_RESERVATION_FEE_PAISE = CLUB_ROGUE_RESERVATION_FEE_INR * 100;

/** Razorpay domestic cards/UPI — confirm against your Razorpay dashboard tariff. */
export const CLUB_ROGUE_RAZORPAY_FEE_PERCENT = 2;
export const CLUB_ROGUE_RAZORPAY_FEE_GST_PERCENT = 18;

export const CLUB_ROGUE_FEE_BREAKDOWN_LABELS = {
  confirmation: "Confirmation fee",
  gstHandling: "GST & handling charges",
  total: "Total",
} as const;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 18% GST on the confirmation fee (portion of the GST & handling line). */
export function clubRogueGstOnConfirmationInr(
  confirmationInr = CLUB_ROGUE_CONFIRMATION_FEE_INR
): number {
  return round2((confirmationInr * CLUB_ROGUE_SERVICE_GST_PERCENT) / 100);
}

/** Razorpay deduction: 2% + 18% GST on the gateway fee. */
export function clubRogueRazorpayDeductionInr(
  totalInr = CLUB_ROGUE_RESERVATION_FEE_INR
): number {
  const fee = totalInr * (CLUB_ROGUE_RAZORPAY_FEE_PERCENT / 100);
  const gstOnFee = fee * (CLUB_ROGUE_RAZORPAY_FEE_GST_PERCENT / 100);
  return round2(fee + gstOnFee);
}

/** Estimated amount credited after Razorpay fees (before your GST remittance). */
export function clubRogueEstimatedSettlementInr(
  totalInr = CLUB_ROGUE_RESERVATION_FEE_INR
): number {
  return round2(totalInr - clubRogueRazorpayDeductionInr(totalInr));
}

/**
 * Customer-facing second line = GST on confirmation + internet/payment handling.
 * Handling portion (~₹1.62) covers Razorpay (~₹1.18) with a small buffer.
 */
export const CLUB_ROGUE_GST_HANDLING_INR =
  CLUB_ROGUE_RESERVATION_FEE_INR - CLUB_ROGUE_CONFIRMATION_FEE_INR;

export function clubRogueFeeInternals() {
  const gstOnConfirmation = clubRogueGstOnConfirmationInr();
  const razorpay = clubRogueRazorpayDeductionInr();
  const internetHandling = round2(CLUB_ROGUE_GST_HANDLING_INR - gstOnConfirmation);
  const settlement = clubRogueEstimatedSettlementInr();
  return {
    confirmationInr: CLUB_ROGUE_CONFIRMATION_FEE_INR,
    gstOnConfirmationInr: gstOnConfirmation,
    internetHandlingInr: internetHandling,
    gstHandlingLineInr: CLUB_ROGUE_GST_HANDLING_INR,
    razorpayDeductionInr: razorpay,
    customerTotalInr: CLUB_ROGUE_RESERVATION_FEE_INR,
    estimatedSettlementInr: settlement,
  };
}

/** Resolved customer total in INR (env `CLUB_ROGUE_RESERVATION_FEE_PAISE` or default ₹50). */
export function clubRogueReservationFeeInr(): number {
  const raw = process.env.CLUB_ROGUE_RESERVATION_FEE_PAISE?.trim();
  if (raw && /^\d+$/.test(raw)) return Math.max(1, parseInt(raw, 10) / 100);
  return CLUB_ROGUE_RESERVATION_FEE_INR;
}

export type ClubRogueCustomerFeeBreakdown = {
  totalInr: number;
  confirmationInr: number;
  gstHandlingInr: number;
  /** Full ₹41 + ₹9 split — hidden for low test amounts (e.g. ₹2). */
  showDetailedGst: boolean;
};

/** Guest-facing fee lines for the booking card and payment status API. */
export function getClubRogueCustomerFeeBreakdown(): ClubRogueCustomerFeeBreakdown {
  const totalInr = clubRogueReservationFeeInr();
  if (totalInr <= 10) {
    return {
      totalInr,
      confirmationInr: totalInr,
      gstHandlingInr: 0,
      showDetailedGst: false,
    };
  }
  return {
    totalInr,
    confirmationInr: CLUB_ROGUE_CONFIRMATION_FEE_INR,
    gstHandlingInr: round2(totalInr - CLUB_ROGUE_CONFIRMATION_FEE_INR),
    showDetailedGst: true,
  };
}
