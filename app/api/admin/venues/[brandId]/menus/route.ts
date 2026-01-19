import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAdminToken, canAccessVenue } from "@/lib/admin-auth";
import { AdminRole } from "@/lib/auth";

// POST - Create or update menu
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const admin = await verifyAdminToken(request);
    if (!admin) {
      console.error("[API] Unauthorized menu save attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { brandId } = await params;
    console.log(`[API] Menu save request for venue: ${brandId} by admin: ${admin.username}`);
    
    const body = await request.json();
    const { menuId, name, thumbnailUrl, images } = body;

    if (!name || !thumbnailUrl || !images || !Array.isArray(images)) {
      console.error(`[API] Invalid request data - name: ${!!name}, thumbnailUrl: ${!!thumbnailUrl}, images: ${Array.isArray(images)}`);
      return NextResponse.json(
        { error: "Missing required fields: name, thumbnailUrl, and images array are required" },
        { status: 400 }
      );
    }

    if (images.length === 0) {
      console.error(`[API] Empty images array for menu "${name}"`);
      return NextResponse.json(
        { error: "At least one menu image is required" },
        { status: 400 }
      );
    }

    console.log(`[API] Processing menu "${name}" with ${images.length} image(s) for venue ${brandId}`);

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

    // Validate image URLs
    const invalidImages = images.filter((img: any) => !img.url || typeof img.url !== "string");
    if (invalidImages.length > 0) {
      console.error(`[API] Invalid image data: ${invalidImages.length} images missing valid URLs`);
      return NextResponse.json(
        { error: `Invalid image data: ${invalidImages.length} image(s) missing valid URLs` },
        { status: 400 }
      );
    }

    let menu;
    if (menuId) {
      // Update existing menu
      console.log(`[API] Updating existing menu ${menuId}`);
      await prisma.menuImage.deleteMany({
        where: { menuId },
      });

      menu = await prisma.menu.update({
        where: { id: menuId },
        data: {
          name,
          thumbnailUrl,
          images: {
            create: images.map((img: { url: string; order: number }) => ({
              url: img.url,
              order: img.order || 0,
            })),
          },
        },
        include: {
          images: true,
        },
      });
      console.log(`[API] Successfully updated menu ${menuId} with ${menu.images.length} images`);
    } else {
      // Create new menu
      console.log(`[API] Creating new menu "${name}" for venue ${venue.id}`);
      menu = await prisma.menu.create({
        data: {
          venueId: venue.id,
          name,
          thumbnailUrl,
          images: {
            create: images.map((img: { url: string; order: number }) => ({
              url: img.url,
              order: img.order || 0,
            })),
          },
        },
        include: {
          images: true,
        },
      });
      console.log(`[API] Successfully created menu ${menu.id} with ${menu.images.length} images`);
    }

    return NextResponse.json({ menu });
  } catch (error: any) {
    console.error("[API] Error creating/updating menu:", error);
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

// DELETE - Delete menu
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const admin = await verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const menuId = searchParams.get("menuId");

    if (!menuId) {
      return NextResponse.json(
        { error: "Menu ID required" },
        { status: 400 }
      );
    }

    await prisma.menu.delete({
      where: { id: menuId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting menu:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
