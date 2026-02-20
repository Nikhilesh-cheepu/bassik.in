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

    const [limits, usageRows] = await Promise.all([
      prisma.discountLimit.findMany({ where: { brandId } }),
      prisma.discountUsage.findMany({ where: { brandId, date } }),
    ]);

    const usageByDiscount = Object.fromEntries(
      usageRows.map((u) => [u.discountId, u.usedCount])
    );

    const discountOptions = getDiscountIdsForBrand(brandId);
    const items = discountOptions.map((opt) => {
      const limit = limits.find((l) => l.discountId === opt.id);
      const used = usageByDiscount[opt.id] ?? 0;
      const max = limit?.maxPerDay ?? 0;
      return {
        discountId: opt.id,
        label: opt.label,
        maxPerDay: max,
        used,
        available: max <= 0 ? true : used < max,
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
 * POST body: { discountId: string, maxPerDay: number }
 * Creates or updates limit for this brand. maxPerDay 0 = unlimited.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const body = await request.json();
    const discountId = typeof body.discountId === "string" ? body.discountId.trim() : null;
    const maxPerDay = typeof body.maxPerDay === "number" ? body.maxPerDay : Number(body.maxPerDay);

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
      where: {
        brandId_discountId: { brandId, discountId },
      },
      create: { brandId, discountId, maxPerDay: Math.max(0, Math.floor(maxPerDay)) },
      update: { maxPerDay: Math.max(0, Math.floor(maxPerDay)) },
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
