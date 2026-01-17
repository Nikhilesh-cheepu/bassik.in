import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAdminToken, canAccessVenue } from "@/lib/admin-auth";
import { AdminRole } from "@/lib/auth";

// Define ImageType enum
enum ImageType {
  COVER = "COVER",
  GALLERY = "GALLERY",
}

// POST - Add images to venue
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const admin = await verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { brandId } = await params;
    const body = await request.json();
    const { images, type } = body; // images: [{url, order}], type: "COVER" | "GALLERY"

    if (!images || !Array.isArray(images) || !type) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    const venue = await prisma.venue.findUnique({
      where: { brandId },
    });

    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    // Check permission
    if (admin.role !== "MAIN_ADMIN") {
      if (!(await canAccessVenue(admin, brandId))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Delete existing images of this type
    await prisma.venueImage.deleteMany({
      where: {
        venueId: venue.id,
        type: type as ImageType,
      },
    });

    // Create new images
    const createdImages = await prisma.venueImage.createMany({
      data: images.map((img: { url: string; order: number }) => ({
        venueId: venue.id,
        url: img.url,
        type: type as ImageType,
        order: img.order || 0,
      })),
    });

    return NextResponse.json({ success: true, count: createdImages.count });
  } catch (error) {
    console.error("Error adding images:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete images
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const admin = await verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { brandId } = await params;
    const { searchParams } = new URL(request.url);
    const imageIds = searchParams.get("ids")?.split(",");

    if (!imageIds || imageIds.length === 0) {
      return NextResponse.json(
        { error: "Image IDs required" },
        { status: 400 }
      );
    }

    await prisma.venueImage.deleteMany({
      where: {
        id: { in: imageIds },
        venue: { brandId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting images:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
