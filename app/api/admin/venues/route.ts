import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// Define ImageType enum
enum ImageType {
  COVER = "COVER",
  GALLERY = "GALLERY",
}

// GET - Get all venues with their data (filtered by permissions)
export async function GET(request: NextRequest) {
  try {
    let where: any = {};
    
    const venues = await prisma.venue.findMany({
      where,
      include: {
        images: {
          orderBy: [{ type: "asc" }, { order: "asc" }],
        },
        offers: { orderBy: { order: "asc" } },
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

    return NextResponse.json({ venues }, { headers: noCacheHeaders });
  } catch (error) {
    const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null;
    console.error("Error fetching venues:", error);
    if (code) console.error("Prisma code:", code, "meta:", (error as Prisma.PrismaClientKnownRequestError).meta);
    // Return empty list so admin panel still loads; user can retry or check DB/env
    return NextResponse.json(
      { venues: [] },
      { status: 200, headers: noCacheHeaders }
    );
  }
}

// POST - Create or update venue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brandId, name, shortName, address, mapUrl, contactPhone, contactNumbers } = body;

    if (!brandId) {
      return NextResponse.json(
        { error: "Missing required fields: brandId" },
        { status: 400 }
      );
    }

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
