import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAdminToken, canAccessVenue } from "@/lib/admin-auth";
import { AdminRole } from "@/lib/auth";

// Define ImageType enum
enum ImageType {
  COVER = "COVER",
  GALLERY = "GALLERY",
}

// GET - Get all venues with their data (filtered by permissions)
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let where: any = {};
    
    // If not main admin, filter by permissions
    if (admin.role !== "MAIN_ADMIN") {
      where.brandId = { in: admin.venuePermissions };
    }

    const venues = await prisma.venue.findMany({
      where,
      include: {
        images: {
          orderBy: [{ type: "asc" }, { order: "asc" }],
        },
        menus: {
          include: {
            images: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ venues });
  } catch (error) {
    console.error("Error fetching venues:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create or update venue
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { brandId, name, shortName, address, mapUrl } = body;

    if (!brandId || !name || !shortName || !address) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check permission
    if (admin.role !== "MAIN_ADMIN") {
      if (!(await canAccessVenue(admin, brandId))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const venue = await prisma.venue.upsert({
      where: { brandId },
      update: {
        name,
        shortName,
        address,
        mapUrl: mapUrl || null,
      },
      create: {
        brandId,
        name,
        shortName,
        address,
        mapUrl: mapUrl || null,
      },
    });

    return NextResponse.json({ venue });
  } catch (error) {
    console.error("Error creating/updating venue:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
