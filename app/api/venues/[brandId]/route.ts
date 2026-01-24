import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET - Get venue data for public display
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;

    // Add cache headers for better performance
    const headers = {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    };

    // Optimize query - only fetch what's needed, use select for better performance
    const venue = await prisma.venue.findUnique({
      where: { brandId },
      select: {
        id: true,
        brandId: true,
        name: true,
        shortName: true,
        address: true,
        mapUrl: true,
        images: {
          orderBy: [{ type: "asc" }, { order: "asc" }],
          select: {
            url: true,
            type: true,
          },
        },
        menus: {
          include: {
            images: {
              orderBy: { order: "asc" },
              select: {
                url: true,
              },
            },
          },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            thumbnailUrl: true,
            images: {
              select: {
                url: true,
              },
            },
          },
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

    return NextResponse.json(
      {
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
      },
      { headers }
    );
  } catch (error) {
    console.error("Error fetching venue:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
