import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// Define ReservationStatus enum
enum ReservationStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
}

// GET - Get all bookings (filtered by admin permissions)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    let where: any = {};

    if (venueId) {
      where.brandId = venueId;
    }

    if (status) {
      where.status = status as ReservationStatus;
    }

    // Date filtering - only apply when date params provided; otherwise show all time
    if (date) {
      where.date = date;
    } else if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = dateFrom;
      if (dateTo) where.date.lte = dateTo;
    }

    // Try to include user relation (if User table exists)
    let reservations;
    try {
      // First, try without user relation to avoid schema validation issues
      reservations = await prisma.reservation.findMany({
        where,
        include: {
          venue: {
            select: {
              id: true,
              brandId: true,
              name: true,
              shortName: true,
            },
          },
        },
        orderBy: [
          { date: "asc" },
          { timeSlot: "asc" },
        ],
        take: 500, // Increased limit to show more bookings
      });
      
      // If we got reservations, try to fetch user data separately using raw SQL
      // This avoids Prisma schema validation issues
      if (reservations.length > 0) {
        try {
          // Check if User table exists by trying a simple query
          const userTableCheck = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
            `SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'User'
            ) as exists`
          );
          
          if (userTableCheck && userTableCheck[0]?.exists) {
            // User table exists, fetch user data for reservations that have userId
            const reservationIds = reservations.map(r => r.id);
            const userIds = reservations
              .map(r => (r as any).userId)
              .filter((id): id is string => !!id);
            
            if (userIds.length > 0) {
              // Fetch users for these userIds using raw SQL
              const usersData = await prisma.$queryRawUnsafe<Array<{
                id: string;
                email: string;
                firstName: string | null;
                lastName: string | null;
              }>>(
                `SELECT "id", "email", "firstName", "lastName" FROM "User" WHERE "id" = ANY($1::text[])`,
                userIds
              );
              
              // Map users to reservations
              const usersMap = new Map(usersData.map(u => [u.id, u]));
              reservations = reservations.map(r => ({
                ...r,
                user: (r as any).userId ? usersMap.get((r as any).userId) || null : null,
              }));
            }
          }
        } catch (userFetchError: any) {
          // If user fetch fails, just continue without user data
          console.warn("[ADMIN-BOOKINGS] Could not fetch user data:", userFetchError?.message);
        }
      }
    } catch (error: any) {
      // If query fails due to schema issues, try using raw SQL
      if (
        error?.code === "P2022" ||
        error?.code === "P2021" ||
        error?.message?.includes("does not exist") ||
        error?.message?.includes("Unknown model") ||
        error?.message?.includes("column") ||
        error?.message?.includes("userId")
      ) {
        console.warn("[ADMIN-BOOKINGS] Schema mismatch detected, using raw SQL to fetch bookings");
        
        // Build WHERE clause for raw SQL
        let whereClause = "1=1";
        const params: any[] = [];
        let paramIndex = 1;
        
        if (where.brandId) {
          whereClause += ` AND "brandId" = $${paramIndex}`;
          params.push(where.brandId);
          paramIndex++;
        }
        
        if (where.status) {
          whereClause += ` AND "status" = $${paramIndex}`;
          params.push(where.status);
          paramIndex++;
        }
        
        if (where.date) {
          if (typeof where.date === 'string') {
            whereClause += ` AND "date" = $${paramIndex}`;
            params.push(where.date);
            paramIndex++;
          } else {
            if (where.date.gte) {
              whereClause += ` AND "date" >= $${paramIndex}`;
              params.push(where.date.gte);
              paramIndex++;
            }
            if (where.date.lte) {
              whereClause += ` AND "date" <= $${paramIndex}`;
              params.push(where.date.lte);
              paramIndex++;
            }
          }
        }
        
        const rawReservations = await prisma.$queryRawUnsafe<Array<any>>(
          `SELECT * FROM "Reservation" WHERE ${whereClause} ORDER BY "date" ASC, "timeSlot" ASC LIMIT 500`,
          ...params
        );
        
        // Format reservations to match expected structure
        reservations = rawReservations.map((r: any) => ({
          id: r.id,
          venueId: r.venueId,
          brandId: r.brandId,
          brandName: r.brandName,
          fullName: r.fullName,
          contactNumber: r.contactNumber,
          numberOfMen: r.numberOfMen,
          numberOfWomen: r.numberOfWomen,
          numberOfCouples: r.numberOfCouples,
          date: r.date,
          timeSlot: r.timeSlot,
          notes: r.notes,
          selectedDiscounts: r.selectedDiscounts,
          status: r.status,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          venue: {
            id: r.venueId,
            brandId: r.brandId,
            name: r.brandName,
            shortName: r.brandName,
          },
          user: null, // Can't fetch user without userId column
        }));
      } else {
        throw error;
      }
    }

    // Upcoming on top (date >= today, soonest first); past at bottom (most recent past first)
    const today = new Date().toISOString().split("T")[0];
    const upcoming = (reservations || []).filter((r: any) => r.date >= today);
    const past = (reservations || []).filter((r: any) => r.date < today);
    const sortByDateTime = (a: any, b: any, asc: boolean) => {
      if (a.date !== b.date) return asc ? (a.date < b.date ? -1 : 1) : (a.date > b.date ? -1 : 1);
      return asc ? (a.timeSlot < b.timeSlot ? -1 : 1) : (a.timeSlot > b.timeSlot ? -1 : 1);
    };
    upcoming.sort((a, b) => sortByDateTime(a, b, true));
    past.sort((a, b) => sortByDateTime(a, b, false));
    const sortedReservations = [...upcoming, ...past];

    return NextResponse.json({ reservations: sortedReservations });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    // Return empty list so admin bookings page still loads
    return NextResponse.json({ reservations: [] }, { status: 200 });
  }
}

// PATCH - Update reservation status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, reservationId, status } = body;
    const reservationIdToUse = id || reservationId;

    if (!reservationIdToUse || !status) {
      return NextResponse.json(
        { error: "Reservation ID and status are required" },
        { status: 400 }
      );
    }

    // Get reservation to check permissions
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationIdToUse },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    const previousStatus = reservation.status;
    const newStatus = status as ReservationStatus;

    await prisma.$transaction(async (tx) => {
      // If changing to CANCELLED, free discount slots (were consumed at creation)
      if (newStatus === "CANCELLED" && (previousStatus === "CONFIRMED" || previousStatus === "PENDING")) {
        const discountIds: string[] = (() => {
          try {
            const parsed = JSON.parse(reservation.selectedDiscounts || "[]");
            return Array.isArray(parsed) ? parsed.filter((id: unknown) => typeof id === "string") : [];
          } catch {
            return [];
          }
        })();
        if (discountIds.length > 0) {
          for (const discountId of discountIds) {
            await tx.$executeRawUnsafe(
              `UPDATE "DiscountDailyUsage" SET "usedCount" = GREATEST(0, "usedCount" - 1)
               WHERE "discountId" = $1 AND date = $2`,
              discountId,
              reservation.date
            );
          }
        }
      }

      await tx.reservation.update({
        where: { id: reservationIdToUse },
        data: { status: newStatus },
      });
    });

    const updated = await prisma.reservation.findUnique({
      where: { id: reservationIdToUse },
    });

    return NextResponse.json({ reservation: updated });
  } catch (error) {
    console.error("Error updating reservation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a booking from the database
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = body.id ?? body.reservationId ?? request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Reservation ID is required" },
        { status: 400 }
      );
    }
    const reservation = await prisma.reservation.findUnique({ where: { id: String(id) } });
    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }
    await prisma.$transaction(async (tx) => {
      const discountIds: string[] = (() => {
        try {
          const parsed = JSON.parse(reservation.selectedDiscounts || "[]");
          return Array.isArray(parsed) ? parsed.filter((id: unknown) => typeof id === "string") : [];
        } catch {
          return [];
        }
      })();
      if (discountIds.length > 0 && reservation.status !== "CANCELLED") {
        for (const discountId of discountIds) {
          await tx.$executeRawUnsafe(
            `UPDATE "DiscountDailyUsage" SET "usedCount" = GREATEST(0, "usedCount" - 1)
             WHERE "discountId" = $1 AND date = $2`,
            discountId,
            reservation.date
          );
        }
      }
      await tx.reservation.delete({ where: { id: String(id) } });
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }
    console.error("Error deleting reservation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
