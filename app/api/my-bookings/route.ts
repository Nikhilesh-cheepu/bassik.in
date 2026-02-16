import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone")?.replace(/\D/g, "").trim();
    const brandId = searchParams.get("brandId")?.trim() || undefined;

    if (!phone || phone.length < 10) {
      return NextResponse.json(
        { error: "Phone number required (at least 10 digits)" },
        { status: 400 }
      );
    }

    const last10 = phone.slice(-10);
    const where: { brandId?: string } = {};
    if (brandId) where.brandId = brandId;

    const all = await prisma.reservation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const bookings = all
      .filter((r) => r.contactNumber.replace(/\D/g, "").slice(-10) === last10)
      .slice(0, 50);

    return NextResponse.json({ bookings });
  } catch (error: any) {
    console.error("[MY-BOOKINGS] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}
