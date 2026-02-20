import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/** DELETE - Remove discount */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ brandId: string; discountId: string }> }
) {
  try {
    const { brandId, discountId } = await params;
    const venue = await prisma.venue.findUnique({ where: { brandId } });
    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }
    const discount = await prisma.discount.findFirst({
      where: { id: discountId, venueId: venue.id },
    });
    if (!discount) {
      return NextResponse.json({ error: "Discount not found" }, { status: 404 });
    }
    await prisma.discount.delete({ where: { id: discountId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin discounts DELETE]", error);
    return NextResponse.json({ error: "Failed to delete discount" }, { status: 500 });
  }
}
