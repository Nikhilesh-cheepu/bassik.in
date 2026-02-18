import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const maxDuration = 30;
export const runtime = "nodejs";

function isBlobOrHttpUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const t = url.trim().toLowerCase();
  return t.startsWith("https://") || t.startsWith("http://");
}

// POST - Create or update menu
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    console.log(`[API] Menu save request for venue: ${brandId}`);
    
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

    // Only allow Blob or http(s) URLs — no raw image data in DB
    if (!isBlobOrHttpUrl(thumbnailUrl)) {
      return NextResponse.json(
        { error: "Thumbnail URL must be from Vercel Blob (upload via Admin). No base64 or data URLs." },
        { status: 400 }
      );
    }
    const invalidImages = images.filter((img: any) => !isBlobOrHttpUrl(img?.url));
    if (invalidImages.length > 0) {
      return NextResponse.json(
        { error: "All menu image URLs must be from Vercel Blob (upload via Admin). No base64 or data URLs." },
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
    // Auth for admin routes is enforced by middleware; this handler just deletes the menu.
    await params; // ensure params are awaited so Next.js doesn't warn, even though we don't need brandId here

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
