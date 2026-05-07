import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { BRANDS, getVenueLabelsFromCatalog } from "@/lib/brands";
import { getContactForBrand, getWhatsAppMessageForBrand } from "@/lib/outlet-contacts";
import { mergeOutletUi } from "@/lib/outlet-ui-config";

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
    const { name: displayName, shortName: displayShortName } = getVenueLabelsFromCatalog(
      brandId,
      venue.name,
      venue.shortName
    );
    const whatsappMessage = getWhatsAppMessageForBrand(brandId, displayShortName);

    const offers = (venue as any).offers.map((o: {
      id: string;
      imageUrl: string;
      title?: string | null;
      description?: string | null;
      eventDate?: string | null;
      eventContinuous?: boolean;
      entryLabel?: string | null;
      capacityText?: string | null;
    }) => ({
      id: o.id,
      imageUrl: o.imageUrl,
      title: o.title ?? null,
      description: o.description ?? null,
      eventDate: o.eventDate ?? null,
      eventContinuous: Boolean(o.eventContinuous),
      entryLabel: o.entryLabel ?? null,
      capacityText: o.capacityText ?? null,
    }));
    const rawSectionVisibility = (venue as { sectionVisibility?: unknown }).sectionVisibility;
    const sectionVisibility = {
      menu: rawSectionVisibility && typeof rawSectionVisibility === "object" && "menu" in (rawSectionVisibility as Record<string, unknown>)
        ? Boolean((rawSectionVisibility as Record<string, unknown>).menu)
        : true,
      photos: rawSectionVisibility && typeof rawSectionVisibility === "object" && "photos" in (rawSectionVisibility as Record<string, unknown>)
        ? Boolean((rawSectionVisibility as Record<string, unknown>).photos)
        : true,
      spots: rawSectionVisibility && typeof rawSectionVisibility === "object" && "spots" in (rawSectionVisibility as Record<string, unknown>)
        ? Boolean((rawSectionVisibility as Record<string, unknown>).spots)
        : true,
    };

    const outletUi = mergeOutletUi((venue as { outletUi?: unknown }).outletUi);

    return NextResponse.json(
      {
        venue: {
          id: venue.id,
          brandId: venue.brandId,
          name: displayName,
          shortName: displayShortName,
          address: venue.address,
          mapUrl: venue.mapUrl,
          contactPhone,
          contactNumbers,
          whatsappMessage,
          galleryImages,
          menus,
          offers,
          sectionVisibility,
          outletUi,
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
              sectionVisibility: { menu: true, photos: true, spots: true },
              outletUi: mergeOutletUi(null),
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
