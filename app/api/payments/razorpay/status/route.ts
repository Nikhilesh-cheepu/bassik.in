import { NextResponse } from "next/server";
import { getClubRogueCustomerFeeBreakdown } from "@/lib/club-rogue-fees";
import { isRazorpayConfigured } from "@/lib/razorpay";

export async function GET() {
  return NextResponse.json({
    configured: isRazorpayConfigured(),
    ...getClubRogueCustomerFeeBreakdown(),
  });
}
