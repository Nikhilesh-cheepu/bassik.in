import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAdminToken, canAccessVenue } from "@/lib/admin-auth";
import { AdminRole } from "@/lib/auth";

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
    const admin = await verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    let where: any = {};

    // If main admin, can see all. Otherwise, filter by permissions
    if (admin.role !== "MAIN_ADMIN") {
      where.brandId = { in: admin.venuePermissions };
    }

    if (venueId) {
      where.brandId = venueId;
      // Check permission for this venue
      if (admin.role !== "MAIN_ADMIN") {
      const permissions: string[] = admin.venuePermissions || [];
      if (!permissions.includes(venueId)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
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

    const reservations = await prisma.reservation.findMany({
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
      take: 100, // Limit to recent 100
    });

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
    const admin = await verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Check permission
    if (admin.role !== "MAIN_ADMIN") {
      if (!admin.venuePermissions.includes(reservation.brandId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

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
