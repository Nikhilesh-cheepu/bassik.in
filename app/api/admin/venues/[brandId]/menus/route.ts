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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { brandId } = await params;
    const body = await request.json();
    const { menuId, name, thumbnailUrl, images } = body;

    if (!name || !thumbnailUrl || !images || !Array.isArray(images)) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    let menu;
    if (menuId) {
      // Update existing menu
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
    } else {
      // Create new menu
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
    }

    return NextResponse.json({ menu });
  } catch (error) {
    console.error("Error creating/updating menu:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
