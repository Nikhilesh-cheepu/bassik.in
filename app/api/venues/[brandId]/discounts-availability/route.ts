import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDiscountIdsForBrand } from "@/lib/reservation-discounts";

export const runtime = "nodejs";

/**
 * GET ?date=YYYY-MM-DD
 * Returns discount availability for the brand.
 * maxClaims = total claims cap (used when set); else maxPerDay = per-day cap.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const dateParam = request.nextUrl.searchParams.get("date");
    const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : new Date().toISOString().split("T")[0];

    const [limits, usageRows] = await Promise.all([
      prisma.discountLimit.findMany({ where: { brandId } }),
      prisma.discountUsage.findMany({ where: { brandId, date } }),
    ]);
    const usageByDiscount = Object.fromEntries(
      usageRows.map((u) => [u.discountId, u.usedCount])
    );
    const limitsByDiscount = Object.fromEntries(limits.map((l) => [l.discountId, l]));

    const discountIds = getDiscountIdsForBrand(brandId).map((d) => d.id);
    const availability = discountIds.map((discountId) => {
      const limit = limitsByDiscount[discountId];
      if (!limit) {
        return { discountId, used: 0, max: null, available: true };
      }
      const maxClaims = limit.maxClaims ?? null;
      const claimsUsed = limit.claimsUsed ?? 0;
      const perDayUsed = usageByDiscount[discountId] ?? 0;
      const maxPerDay = limit.maxPerDay ?? 0;

      let available = true;
      let used = 0;
      let max: number | null = null;

      if (maxClaims != null && maxClaims > 0) {
        used = claimsUsed;
        max = maxClaims;
        available = claimsUsed < maxClaims;
      } else if (maxPerDay > 0) {
        used = perDayUsed;
        max = maxPerDay;
        available = perDayUsed < maxPerDay;
      }

      return { discountId, used, max, available };
    });

    return NextResponse.json(
      { date, availability },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
        },
      }
    );
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2022" || error?.message?.includes("does not exist")) {
      console.warn("[discounts-availability GET] DiscountLimit/DiscountUsage tables not found, returning empty (run prisma migrate deploy)");
      return NextResponse.json(
        { date: request.nextUrl.searchParams.get("date") ?? "", availability: [] },
        { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } }
      );
    }
    console.error("[discounts-availability GET]", error);
    return NextResponse.json(
      { error: "Failed to load discount availability" },
      { status: 500 }
    );
  }
}
