import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user info from Clerk to match by contact number
    const clerkUser = await currentUser();
    const userPhone = clerkUser?.phoneNumbers?.[0]?.phoneNumber?.replace(/\D/g, "").slice(-10) || "";
    const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress || "";

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");

    // Build where clause - try multiple strategies to find user's bookings
    let bookings: any[] = [];
    const where: any = {};

    // Filter by brandId if provided
    if (brandId) {
      where.brandId = brandId;
    }

    try {
      // Strategy 1: Try to filter by userId (if field exists and migration is run)
      where.userId = userId;
      bookings = await prisma.reservation.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
      });
    } catch (error: any) {
      // If userId field doesn't exist, continue to Strategy 2
      if (
        error?.code === "P2009" || 
        error?.message?.includes("Unknown argument") ||
        error?.message?.includes("userId") ||
        error?.message?.includes("Unknown field") ||
        error?.code === "P2022"
      ) {
        console.log("[MY-BOOKINGS] userId field not found, trying to match by contact number");
        // Strategy 2: Match by contact number (for bookings made via WhatsApp or before migration)
        // Remove userId from where clause
        delete where.userId;
        
        // If we have user's phone number, try to match by contactNumber
        if (userPhone) {
          // Try exact match first
          where.contactNumber = userPhone;
          try {
            bookings = await prisma.reservation.findMany({
              where,
              orderBy: {
                createdAt: "desc",
              },
            });
          } catch (contactError: any) {
            console.warn("[MY-BOOKINGS] Error matching by contact number:", contactError);
            bookings = [];
          }
          
          // If no exact match, try matching last 10 digits (in case of formatting differences)
          if (bookings.length === 0 && userPhone.length >= 10) {
            const last10Digits = userPhone.slice(-10);
            try {
              // Use raw query to match last 10 digits
              const rawBookings = await prisma.$queryRawUnsafe<Array<any>>(
                `SELECT * FROM "Reservation" 
                 WHERE "contactNumber" LIKE $1 
                 ${brandId ? `AND "brandId" = $2` : ''}
                 ORDER BY "createdAt" DESC`,
                `%${last10Digits}%`,
                ...(brandId ? [brandId] : [])
              );
              bookings = rawBookings || [];
            } catch (rawError) {
              console.warn("[MY-BOOKINGS] Error with raw query:", rawError);
            }
          }
        } else {
          // No phone number available, return empty
          console.warn("[MY-BOOKINGS] No phone number available for user, cannot match bookings");
          bookings = [];
        }
      } else {
        throw error;
      }
    }

    // If still no bookings found and we have userId, try to find bookings without userId filter
    // (for backward compatibility - show all bookings if userId field doesn't exist)
    if (bookings.length === 0) {
      try {
        const fallbackWhere: any = {};
        if (brandId) {
          fallbackWhere.brandId = brandId;
        }
        // Only show all bookings if we can't match by user (last resort)
        // This handles the case where migration hasn't been run
        if (!brandId) {
          console.log("[MY-BOOKINGS] No bookings found for user, returning empty");
        } else {
          bookings = await prisma.reservation.findMany({
            where: fallbackWhere,
            orderBy: {
              createdAt: "desc",
            },
            take: 50, // Limit to recent 50 if showing all
          });
        }
      } catch (fallbackError) {
        console.error("[MY-BOOKINGS] Fallback query failed:", fallbackError);
      }
    }

    return NextResponse.json({ bookings: bookings || [] });
  } catch (error: any) {
    console.error("[MY-BOOKINGS] Error fetching bookings:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}
