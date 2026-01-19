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
      console.error("[API] Unauthorized image upload attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { brandId } = await params;
    console.log(`[API] Image upload request for venue: ${brandId} by admin: ${admin.username}`);
    
    const body = await request.json();
    const { images, type } = body; // images: [{url, order}], type: "COVER" | "GALLERY"

    if (!images || !Array.isArray(images) || !type) {
      console.error(`[API] Invalid request data - images: ${Array.isArray(images)}, type: ${type}`);
      return NextResponse.json(
        { error: "Invalid request data: images array and type are required" },
        { status: 400 }
      );
    }

    console.log(`[API] Processing ${images.length} images of type ${type} for venue ${brandId}`);

    const venue = await prisma.venue.findUnique({
      where: { brandId },
    });

    if (!venue) {
      console.error(`[API] Venue not found: ${brandId}`);
      return NextResponse.json({ error: `Venue not found: ${brandId}` }, { status: 404 });
    }

    // Check permission
    if (admin.role !== "MAIN_ADMIN") {
      if (!(await canAccessVenue(admin, brandId))) {
        console.error(`[API] Forbidden: Admin ${admin.username} cannot access venue ${brandId}`);
        return NextResponse.json({ error: "Forbidden: You don't have permission to access this venue" }, { status: 403 });
      }
    }

    // Delete existing images of this type
    const deleteResult = await prisma.venueImage.deleteMany({
      where: {
        venueId: venue.id,
        type: type as ImageType,
      },
    });
    console.log(`[API] Deleted ${deleteResult.count} existing ${type} images for venue ${venue.id}`);

    // Validate image URLs (should be base64 data URLs)
    const invalidImages = images.filter((img: any) => !img.url || typeof img.url !== "string");
    if (invalidImages.length > 0) {
      console.error(`[API] Invalid image data: ${invalidImages.length} images missing valid URLs`);
      return NextResponse.json(
        { error: `Invalid image data: ${invalidImages.length} image(s) missing valid URLs` },
        { status: 400 }
      );
    }

    // Create new images
    const imageData = images.map((img: { url: string; order: number }) => ({
      venueId: venue.id,
      url: img.url,
      type: type as ImageType,
      order: img.order || 0,
    }));

    console.log(`[API] Creating ${imageData.length} new ${type} images for venue ${venue.id}`);
    const createdImages = await prisma.venueImage.createMany({
      data: imageData,
    });

    console.log(`[API] Successfully created ${createdImages.count} ${type} images for venue ${brandId}`);
    return NextResponse.json({ success: true, count: createdImages.count });
  } catch (error: any) {
    console.error("[API] Error adding images:", error);
    console.error("[API] Error stack:", error.stack);
    return NextResponse.json(
      { 
        error: error.message || "Internal server error",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
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
