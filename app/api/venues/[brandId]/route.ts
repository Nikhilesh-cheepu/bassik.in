import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET - Get venue data for public display
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;

    const venue = await prisma.venue.findUnique({
      where: { brandId },
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
          orderBy: { name: "asc" },
        },
      },
    });

    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    // Format data for frontend
    const coverImages = venue.images
      .filter((img: { type: string }) => img.type === "COVER")
      .map((img: { url: string }) => img.url);
    
    const galleryImages = venue.images
      .filter((img: { type: string }) => img.type === "GALLERY")
      .map((img: { url: string }) => img.url);

    const menus = venue.menus.map((menu: { id: string; name: string; thumbnailUrl: string; images: { url: string }[] }) => ({
      id: menu.id,
      name: menu.name,
      thumbnail: menu.thumbnailUrl,
      images: menu.images.map((img: { url: string }) => img.url),
    }));

    return NextResponse.json({
      venue: {
        id: venue.id,
        brandId: venue.brandId,
        name: venue.name,
        shortName: venue.shortName,
        address: venue.address,
        mapUrl: venue.mapUrl,
        coverImages,
        galleryImages,
        menus,
      },
    });
  } catch (error) {
    console.error("Error fetching venue:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
