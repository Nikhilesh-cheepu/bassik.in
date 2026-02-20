import { NextRequest, NextResponse } from "next/server";
import { getDiscountsForBrand } from "@/lib/reservation-discounts";

export const runtime = "nodejs";

/**
 * GET ?date=YYYY-MM-DD&timeSlot=HH:MM&session=lunch|dinner
 * Returns static discounts for the brand (simple, no slots, always available).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const staticList = getDiscountsForBrand(brandId);
    const discounts = staticList.map((d) => ({
      id: d.id,
      title: d.label,
      description: d.description ?? "",
      slotsLeft: 999,
      soldOut: false,
      timeWindowLabel: null,
    }));
    return NextResponse.json(
      { discounts },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch (error) {
    console.error("[discounts-available GET]", error);
    return NextResponse.json({ discounts: [] });
  }
}
