import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDiscountIdsForBrand } from "@/lib/reservation-discounts";

export const runtime = "nodejs";

/**
 * GET ?date=YYYY-MM-DD (optional; default today)
 * Returns discount limits for brand and usage for the given date.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const dateParam = request.nextUrl.searchParams.get("date");
    const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : new Date().toISOString().split("T")[0];

    const limits = await prisma.discountLimit.findMany({ where: { brandId } });
    const usageRows = await prisma.discountUsage.findMany({ where: { brandId, date } });
    const usageByDiscount = Object.fromEntries(
      usageRows.map((u) => [u.discountId, u.usedCount])
    );
    const limitsByDiscount = Object.fromEntries(limits.map((l) => [l.discountId, l]));

    const discountOptions = getDiscountIdsForBrand(brandId);
    const items = discountOptions.map((opt) => {
      const limit = limitsByDiscount[opt.id];
      const maxClaims = limit?.maxClaims ?? null;
      const claimsUsed = limit?.claimsUsed ?? 0;
      const perDayUsed = usageByDiscount[opt.id] ?? 0;
      const maxPerDay = limit?.maxPerDay ?? 0;

      let used = claimsUsed;
      let max = maxClaims;
      let available = true;
      if (maxClaims != null && maxClaims > 0) {
        used = claimsUsed;
        max = maxClaims;
        available = claimsUsed < maxClaims;
      } else if (maxPerDay > 0) {
        used = perDayUsed;
        max = maxPerDay;
        available = perDayUsed < maxPerDay;
      }

      return {
        discountId: opt.id,
        label: opt.label,
        maxPerDay,
        maxClaims: maxClaims ?? undefined,
        claimsUsed,
        used,
        max: max ?? undefined,
        available,
      };
    });

    return NextResponse.json({ date, items });
  } catch (error) {
    console.error("[admin discount-limits GET]", error);
    return NextResponse.json(
      { error: "Failed to load discount limits" },
      { status: 500 }
    );
  }
}

/**
 * POST body: { discountId: string, maxPerDay?: number, maxClaims?: number }
 * Creates or updates limit. maxPerDay 0 = unlimited per day. maxClaims null/empty = unlimited total.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const body = await request.json();
    const discountId = typeof body.discountId === "string" ? body.discountId.trim() : null;
    const maxPerDay = typeof body.maxPerDay === "number" ? body.maxPerDay : Math.max(0, Math.floor(Number(body.maxPerDay) || 0));
    const maxClaimsRaw = body.maxClaims;
    const maxClaims = maxClaimsRaw === "" || maxClaimsRaw == null ? null : Math.max(0, Math.floor(Number(maxClaimsRaw) || 0));

    if (!discountId) {
      return NextResponse.json(
        { error: "discountId is required" },
        { status: 400 }
      );
    }

    const allowed = getDiscountIdsForBrand(brandId).some((d) => d.id === discountId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Invalid discountId for this brand" },
        { status: 400 }
      );
    }

    const limit = await prisma.discountLimit.upsert({
      where: { brandId_discountId: { brandId, discountId } },
      create: { brandId, discountId, maxPerDay, maxClaims },
      update: { maxPerDay, maxClaims },
    });

    return NextResponse.json(limit);
  } catch (error) {
    console.error("[admin discount-limits POST]", error);
    return NextResponse.json(
      { error: "Failed to save discount limit" },
      { status: 500 }
    );
  }
}
