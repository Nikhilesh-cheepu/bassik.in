import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";

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
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: [
          { date: "asc" },
          { timeSlot: "asc" },
        ],
        take: 500, // Increased limit to show more bookings
      });
    } catch (error: any) {
      // If User table doesn't exist, fetch without user relation
      if (
        error?.code === "P2021" ||
        error?.message?.includes("does not exist") ||
        error?.message?.includes("Unknown model") ||
        error?.message?.includes("model User")
      ) {
        console.warn("[ADMIN-BOOKINGS] User table not found, fetching bookings without user relation");
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
          take: 500,
        });
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
