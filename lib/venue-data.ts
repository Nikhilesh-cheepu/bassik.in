import { prisma } from "@/lib/db";
import { BRANDS } from "@/lib/brands";
import { getContactForBrand, getWhatsAppMessageForBrand } from "@/lib/outlet-contacts";
import { Prisma } from "@prisma/client";

export type VenuePayload = {
  offers: { id: string; imageUrl: string; title: string; startDate?: string; endDate?: string; order: number }[];
  galleryImages: string[];
  menus: { id: string; name: string; thumbnail: string; images: string[] }[];
  location: { address: string; mapUrl: string | null };
  contactPhone: string;
  contactNumbers: { phone: string; label?: string }[];
  whatsappMessage: string;
};

const DEFAULT_MAP_URL = "https://maps.app.goo.gl/wD2TKLaW9v5gFnmj6";
const defaultLocation = { address: "", mapUrl: DEFAULT_MAP_URL };

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
        offers: { where: { active: true }, orderBy: { order: "asc" } },
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
    const whatsappMessage = getWhatsAppMessageForBrand(brandId, venue.shortName);
    const offers = (venue as any).offers.map((o: { id: string; imageUrl: string; title: string; startDate: string | null; endDate: string | null; order: number }) => ({
      id: o.id,
      imageUrl: o.imageUrl,
      title: o.title,
      startDate: o.startDate ?? undefined,
      endDate: o.endDate ?? undefined,
      order: o.order,
    }));

    return {
      offers,
      galleryImages,
      menus,
      location: { address: venue.address ?? "", mapUrl: venue.mapUrl ?? DEFAULT_MAP_URL },
      contactPhone,
      contactNumbers,
      whatsappMessage,
    };
  } catch (error) {
    const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null;
    if (code === "P1001" || code === "P2022" || (code && String(code).startsWith("P"))) {
      const brand = BRANDS.find((b) => b.id === brandId);
      if (brand) {
        const contactPhone = getContactForBrand(brandId);
        const whatsappMessage = getWhatsAppMessageForBrand(brandId, brand.shortName);
        return {
          offers: [],
          galleryImages: [],
          menus: [],
          location: defaultLocation,
          contactPhone,
          contactNumbers: [{ phone: contactPhone, label: "Contact" }],
          whatsappMessage,
        };
      }
    }
    return null;
  }
}
