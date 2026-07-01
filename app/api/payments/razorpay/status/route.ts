import { NextRequest, NextResponse } from "next/server";
import { getClubRogueCustomerFeeBreakdown } from "@/lib/club-rogue-fees";
import { isRazorpayConfigured } from "@/lib/razorpay";

export async function GET(req: NextRequest) {
  const rawGuests = req.nextUrl.searchParams.get("guests");
  const guests = rawGuests ? parseInt(rawGuests, 10) : 1;
  return NextResponse.json({
    configured: isRazorpayConfigured(),
    ...getClubRogueCustomerFeeBreakdown(Number.isFinite(guests) ? guests : 1),
  });
}
