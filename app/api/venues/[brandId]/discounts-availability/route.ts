import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET ?date=YYYY-MM-DD
 * Returns discount availability for the brand on the given date.
 * Only call when user has selected a date (no over-fetch).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const date = request.nextUrl.searchParams.get("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Query param date (YYYY-MM-DD) is required" },
        { status: 400 }
      );
    }

    const [limits, usageRows] = await Promise.all([
      prisma.discountLimit.findMany({ where: { brandId } }),
      prisma.discountUsage.findMany({
        where: { brandId, date },
      }),
    ]);

    const usageByDiscount = Object.fromEntries(
      usageRows.map((u) => [u.discountId, u.usedCount])
    );

    const availability = limits.map((limit) => {
      const used = usageByDiscount[limit.discountId] ?? 0;
      const max = limit.maxPerDay;
      const available = max <= 0 ? true : used < max;
      return {
        discountId: limit.discountId,
        used,
        max: max <= 0 ? null : max,
        available,
      };
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
    // P2021 = table does not exist (migration not applied); return empty availability so flow continues
    if (error?.code === "P2021" || error?.message?.includes("does not exist")) {
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
