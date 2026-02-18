import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { BRANDS } from "@/lib/brands";
import { getContactForBrand, getWhatsAppMessageForBrand } from "@/lib/outlet-contacts";

export const runtime = "nodejs";

// GET - Get venue data for public display
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params;
  try {

    // Add cache headers - shorter cache for admin updates to show quickly
    const headers = {
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
    };

    // Fetch venue data with images, menus, and offers
    const venue = await prisma.venue.findUnique({
      where: { brandId },
      include: {
        images: {
          where: { type: "GALLERY" },
          orderBy: { order: "asc" },
        },
        menus: {
          include: {
            images: {
              orderBy: { order: "asc" },
            },
          },
          orderBy: { name: "asc" },
        },
        offers: {
          where: {
            OR: [
              { endDate: null },
              { endDate: { gt: new Date().toISOString() } },
            ],
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    const galleryImages = venue.images.map((img: { url: string }) => img.url);

    const menus = venue.menus.map((menu: { id: string; name: string; thumbnailUrl: string; images: { url: string }[] }) => ({
      id: menu.id,
      name: menu.name,
      thumbnail: menu.thumbnailUrl,
      images: menu.images.map((img: { url: string }) => img.url),
    }));

    const venueExt = venue as { contactPhone?: string | null; contactNumbers?: { phone: string; label?: string }[] | null };
    const rawContacts = venueExt.contactNumbers;
    const contactNumbers: { phone: string; label?: string }[] = Array.isArray(rawContacts) && rawContacts.length > 0
      ? rawContacts.filter((c: any) => c && typeof c.phone === "string" && c.phone.trim())
      : (() => {
          const single = venueExt.contactPhone ?? getContactForBrand(brandId);
          return single ? [{ phone: single, label: "Contact" }] : [];
        })();
    const contactPhone = contactNumbers[0]?.phone ?? getContactForBrand(brandId);
    const whatsappMessage = getWhatsAppMessageForBrand(brandId, venue.shortName);

    const offers = (venue as any).offers.map((o: { id: string; imageUrl: string }) => ({
      id: o.id,
      imageUrl: o.imageUrl,
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
          contactPhone,
          contactNumbers,
          whatsappMessage,
          galleryImages,
          menus,
          offers,
        },
      },
      { headers }
    );
  } catch (error) {
    const prismaCode =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.code
        : null;
    const prismaMeta =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.meta
        : null;
    console.error("Error fetching venue:", error);
    if (prismaCode) console.error("Prisma code:", prismaCode, "meta:", prismaMeta);

    // On DB connection (P1001) or schema/column (P2022) errors, return fallback so the page still loads
    if (
      prismaCode === "P1001" ||
      prismaCode === "P2022" ||
      (prismaCode && String(prismaCode).startsWith("P"))
    ) {
      const brand = BRANDS.find((b) => b.id === brandId);
      if (brand) {
        const contactPhone = getContactForBrand(brandId);
        const whatsappMessage = getWhatsAppMessageForBrand(brandId, brand.shortName);
        const headers = {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        };
        return NextResponse.json(
          {
            venue: {
              id: brandId,
              brandId,
              name: brand.name,
              shortName: brand.shortName,
              address: "",
              mapUrl: null,
              contactPhone,
              contactNumbers: [{ phone: contactPhone, label: "Contact" }],
              whatsappMessage,
              galleryImages: [],
              menus: [],
              offers: [],
            },
          },
          { headers }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
