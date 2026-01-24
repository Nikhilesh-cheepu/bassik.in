import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");

    // Build where clause - handle case where userId field might not exist (migration not run)
    const where: any = {};

    // Filter by brandId if provided
    if (brandId) {
      where.brandId = brandId;
    }

    let bookings;
    try {
      // Try to filter by userId first (if field exists)
      where.userId = userId;
      bookings = await prisma.reservation.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
      });
    } catch (error: any) {
      // If query fails due to userId field not existing, try without userId filter
      if (
        error?.code === "P2009" || 
        error?.message?.includes("Unknown argument") ||
        error?.message?.includes("userId") ||
        error?.message?.includes("Unknown field")
      ) {
        console.warn("userId field not found in Reservation table (migration not run). Fetching bookings by brand only.");
        // Remove userId from where clause and try again
        const brandWhere: any = {};
        if (brandId) {
          brandWhere.brandId = brandId;
        }
        // If no brandId, return empty (can't filter by user without userId field)
        if (!brandId) {
          console.warn("Cannot filter by user without userId field. Returning empty bookings.");
          return NextResponse.json({ bookings: [] });
        }
        bookings = await prisma.reservation.findMany({
          where: brandWhere,
          orderBy: {
            createdAt: "desc",
          },
        });
      } else {
        throw error;
      }
    }

    return NextResponse.json({ bookings: bookings || [] });
  } catch (error: any) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}
