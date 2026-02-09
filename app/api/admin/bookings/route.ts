import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";

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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin role
    const user = await currentUser();
    const role = user?.publicMetadata?.role as string;
    if (role !== "admin" && role !== "main_admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    let where: any = {};

    // For now, all authenticated Clerk users can see all bookings
    // You can add role-based filtering later using Clerk metadata

    if (venueId) {
      where.brandId = venueId;
      // You can add permission checks here using Clerk metadata if needed
    }

    if (status) {
      where.status = status as ReservationStatus;
    }

    // Date filtering - default to today if no date filters
    const today = new Date().toISOString().split("T")[0];
    
    if (date) {
      where.date = date;
    } else {
      where.date = {};
      if (dateFrom) {
        where.date.gte = dateFrom;
      } else {
        // Default "from" to today if not specified
        where.date.gte = today;
      }
      if (dateTo) {
        where.date.lte = dateTo;
      } else {
        // Default "to" to today if not specified
        where.date.lte = today;
      }
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

    return NextResponse.json({ reservations });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update reservation status
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin role
    const user = await currentUser();
    const role = user?.publicMetadata?.role as string;
    if (role !== "admin" && role !== "main_admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

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

    // You can add permission checks here using Clerk metadata if needed

    const updated = await prisma.reservation.update({
      where: { id: reservationIdToUse },
      data: { status: status as ReservationStatus },
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
