import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { BRANDS, HIDDEN_BRAND_IDS } from "@/lib/brands";
import { interleaveEventsByBrand } from "@/lib/home-events-interleave";
import type { HomeFeedEvent } from "@/lib/home-feed-types";

export type { HomeFeedEvent } from "@/lib/home-feed-types";

const MAX_EVENTS = 72;

async function loadHomeFeedEvents(): Promise<HomeFeedEvent[]> {
  const allowedIds = new Set(BRANDS.filter((b) => !HIDDEN_BRAND_IDS.has(b.id)).map((b) => b.id));
  const brandById = new Map(BRANDS.map((b) => [b.id, b]));

  const rows = await prisma.venueOffer.findMany({
    where: {
      venue: { brandId: { in: [...allowedIds] } },
      OR: [{ endDate: null }, { endDate: { gt: new Date().toISOString() } }],
    },
    include: {
      venue: { select: { brandId: true, shortName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: MAX_EVENTS * 2,
  });

  const items = rows
    .filter((o) => allowedIds.has(o.venue.brandId))
    .map((o) => {
      const brand = brandById.get(o.venue.brandId);
      if (!brand) return null;
      const logoPath =
        brand.logoPath ?? (brand.id.startsWith("club-rogue") ? "/logos/club-rogue.png" : `/logos/${brand.id}.png`);
      return {
        id: o.id,
        imageUrl: o.imageUrl,
        title: o.title ?? null,
        description: o.description ?? null,
        eventDate: o.eventDate ?? null,
        entryLabel: o.entryLabel ?? null,
        capacityText: o.capacityText ?? null,
        brandId: o.venue.brandId,
        venueShortName: o.venue.shortName,
        brandShortName: brand.shortName,
        accentColor: brand.accentColor,
        logoPath,
      };
    })
    .filter((x): x is HomeFeedEvent => x !== null);

  const interleaved = interleaveEventsByBrand(items);
  return interleaved.slice(0, MAX_EVENTS);
}

/**
 * Shared by the landing page (SSR) and GET /api/home/events. Cached 30s to cut DB load and TTFB.
 */
export async function getHomeFeedEvents(): Promise<HomeFeedEvent[]> {
  try {
    return await unstable_cache(loadHomeFeedEvents, ["home-feed-events-v1"], {
      revalidate: 30,
    })();
  } catch (e) {
    console.error("[getHomeFeedEvents]", e);
    return [];
  }
}
