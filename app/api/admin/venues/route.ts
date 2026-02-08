import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";

// Define ImageType enum
enum ImageType {
  COVER = "COVER",
  GALLERY = "GALLERY",
}

// GET - Get all venues with their data (filtered by permissions)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let where: any = {};
    
    // For now, all authenticated Clerk users can see all venues
    // You can add role-based filtering later using Clerk metadata

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
          orderBy: { name: "asc" }, // Add ordering for menus
        },
      },
      orderBy: { name: "asc" },
    });

    // Return with no-cache headers to ensure fresh data
    return NextResponse.json(
      { venues },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
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
    const { brandId, name, shortName, address, mapUrl, contactPhone, contactNumbers, coverVideoUrl } = body;

    if (!brandId) {
      return NextResponse.json(
        { error: "Missing required fields: brandId" },
        { status: 400 }
      );
    }

    // You can add permission checks here using Clerk metadata if needed

    // Check if venue exists
    const existingVenue = await prisma.venue.findUnique({
      where: { brandId },
    });

    // Build update data - only include fields that are provided
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (shortName !== undefined) updateData.shortName = shortName;
    if (address !== undefined) updateData.address = address;
    if (mapUrl !== undefined) updateData.mapUrl = mapUrl || null;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone === "" ? null : contactPhone || null;
    if (contactNumbers !== undefined) {
      const valid = Array.isArray(contactNumbers)
        ? contactNumbers
            .filter((c: any) => c && typeof c.phone === "string" && String(c.phone).trim())
            .map((c: any) => {
              const label = typeof c.label === "string" ? c.label.trim() : null;
              return { phone: String(c.phone).trim(), label: label || undefined };
            })
        : [];
      updateData.contactNumbers = valid.length > 0 ? valid : null;
    }
    if (coverVideoUrl !== undefined) updateData.coverVideoUrl = coverVideoUrl === "" ? null : coverVideoUrl || null;

    let venue;
    if (existingVenue) {
      // Update existing venue
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
      }
      venue = await prisma.venue.update({
        where: { brandId },
        data: updateData,
      });
    } else {
      // Create new venue - all fields are required for creation
      if (!name || !shortName || !address) {
        return NextResponse.json(
          { error: "Missing required fields: name, shortName, and address are required for new venues" },
          { status: 400 }
        );
      }
      const createData: any = {
        brandId,
        name,
        shortName,
        address: address || "Address to be updated",
        mapUrl: mapUrl || null,
        coverVideoUrl: coverVideoUrl === "" ? null : coverVideoUrl || null,
      };
      if (contactNumbers !== undefined) {
        const valid = Array.isArray(contactNumbers)
          ? contactNumbers
              .filter((c: any) => c && typeof c.phone === "string" && String(c.phone).trim())
              .map((c: any) => {
                const label = typeof c.label === "string" ? c.label.trim() : null;
                return { phone: String(c.phone).trim(), label: label || undefined };
              })
          : [];
        createData.contactNumbers = valid.length > 0 ? valid : null;
      }
      venue = await prisma.venue.create({ data: createData });
    }

    return NextResponse.json({ venue });
  } catch (error) {
    console.error("Error creating/updating venue:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
