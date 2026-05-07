import { prisma } from "@/lib/db";
import { BRANDS, getVenueLabelsFromCatalog } from "@/lib/brands";
import { getContactForBrand, getWhatsAppMessageForBrand } from "@/lib/outlet-contacts";
import { Prisma } from "@prisma/client";
import { mergeOutletUi, type MergedOutletUi } from "@/lib/outlet-ui-config";

export type VenuePayload = {
  outletUi: MergedOutletUi;
  offers: {
    id: string;
    imageUrl: string;
    title: string | null;
    description: string | null;
    eventDate: string | null;
    eventContinuous: boolean;
    entryLabel: string | null;
    capacityText: string | null;
  }[];
  galleryImages: string[];
  menus: { id: string; name: string; thumbnail: string; images: string[] }[];
  location: { address: string; mapUrl: string | null };
  contactPhone: string;
  contactNumbers: { phone: string; label?: string }[];
  whatsappMessage: string;
  sectionVisibility: {
    menu: boolean;
    photos: boolean;
    spots: boolean;
  };
};

const DEFAULT_MAP_URL = "https://maps.app.goo.gl/wD2TKLaW9v5gFnmj6";
const defaultLocation = { address: "", mapUrl: DEFAULT_MAP_URL };
const defaultSectionVisibility = { menu: true, photos: true, spots: true };


export async function getVenueDataByBrandId(brandId: string): Promise<VenuePayload | null> {
  try {
    const venue = await prisma.venue.findUnique({
      where: { brandId },
      include: {
        images: { where: { type: "GALLERY" }, orderBy: { order: "asc" } },
        menus: {
          include: { images: { orderBy: { order: "asc" } } },
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

    if (!venue) return null;

    const galleryImages = venue.images.map((img: { url: string }) => img.url);
    const menus = venue.menus.map((m: { id: string; name: string; thumbnailUrl: string; images: { url: string }[] }) => ({
      id: m.id,
      name: m.name,
      thumbnail: m.thumbnailUrl,
      images: m.images.map((img: { url: string }) => img.url),
    }));
    const venueExt = venue as { contactPhone?: string | null; contactNumbers?: { phone: string; label?: string }[] | null };
    const rawContacts = venueExt.contactNumbers;
    const contactNumbers: { phone: string; label?: string }[] =
      Array.isArray(rawContacts) && rawContacts.length > 0
        ? rawContacts.filter((c: any) => c && typeof c.phone === "string" && c.phone.trim())
        : (() => {
            const single = venueExt.contactPhone ?? getContactForBrand(brandId);
            return single ? [{ phone: single, label: "Contact" }] : [];
          })();
    const contactPhone = contactNumbers[0]?.phone ?? getContactForBrand(brandId);
    const { shortName: displayShortName } = getVenueLabelsFromCatalog(
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

    return {
      outletUi,
      offers,
      galleryImages,
      menus,
      location: { address: venue.address ?? "", mapUrl: venue.mapUrl ?? DEFAULT_MAP_URL },
      contactPhone,
      contactNumbers,
      whatsappMessage,
      sectionVisibility,
    };
  } catch (error) {
    const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null;
    if (code === "P1001" || code === "P2022" || (code && String(code).startsWith("P"))) {
      const brand = BRANDS.find((b) => b.id === brandId);
      if (brand) {
        const contactPhone = getContactForBrand(brandId);
        const whatsappMessage = getWhatsAppMessageForBrand(brandId, brand.shortName);
        return {
          outletUi: mergeOutletUi(null),
          offers: [],
          galleryImages: [],
          menus: [],
          location: defaultLocation,
          contactPhone,
          contactNumbers: [{ phone: contactPhone, label: "Contact" }],
          whatsappMessage,
          sectionVisibility: defaultSectionVisibility,
        };
      }
    }
    return null;
  }
}
