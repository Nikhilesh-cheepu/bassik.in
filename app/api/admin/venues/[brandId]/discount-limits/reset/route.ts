import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDiscountIdsForBrand } from "@/lib/reservation-discounts";

export const runtime = "nodejs";

/**
 * POST body: { date?: string, discountId?: string, resetClaims?: boolean }
 * resetClaims: reset claimsUsed (total) on DiscountLimit. Else reset per-day DiscountUsage.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const body = await request.json();
    const resetClaims = !!body.resetClaims;
    const discountId = typeof body.discountId === "string" ? body.discountId.trim() || null : null;

    if (resetClaims) {
      if (discountId) {
        const allowed = getDiscountIdsForBrand(brandId).some((d) => d.id === discountId);
        if (!allowed) {
          return NextResponse.json({ error: "Invalid discountId" }, { status: 400 });
        }
        await prisma.discountLimit.updateMany({
          where: { brandId, discountId },
          data: { claimsUsed: 0 },
        });
      } else {
        await prisma.discountLimit.updateMany({
          where: { brandId },
          data: { claimsUsed: 0 },
        });
      }
      return NextResponse.json({ success: true, resetClaims: true, discountId: discountId ?? "all" });
    }

    const date = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : new Date().toISOString().split("T")[0];

    if (discountId) {
      const allowed = getDiscountIdsForBrand(brandId).some((d) => d.id === discountId);
      if (!allowed) {
        return NextResponse.json({ error: "Invalid discountId" }, { status: 400 });
      }
      await prisma.discountUsage.updateMany({
        where: { brandId, discountId, date },
        data: { usedCount: 0 },
      });
    } else {
      await prisma.discountUsage.updateMany({
        where: { brandId, date },
        data: { usedCount: 0 },
      });
    }

    return NextResponse.json({ success: true, date, discountId: discountId ?? "all" });
  } catch (error) {
    console.error("[admin discount-limits reset POST]", error);
    return NextResponse.json(
      { error: "Failed to reset usage" },
      { status: 500 }
    );
  }
}
