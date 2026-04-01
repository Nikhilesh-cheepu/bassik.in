import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { BRANDS, HIDDEN_BRAND_IDS } from "@/lib/brands";

export const runtime = "nodejs";

const MAX_EVENTS = 72;

export async function GET() {
  try {
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
      .filter((x): x is NonNullable<typeof x> => x !== null);

    items.sort((a, b) => {
      const ta = a.eventDate ? Date.parse(a.eventDate) : NaN;
      const tb = b.eventDate ? Date.parse(b.eventDate) : NaN;
      const aOk = !Number.isNaN(ta);
      const bOk = !Number.isNaN(tb);
      if (aOk && bOk && ta !== tb) return ta - tb;
      if (aOk && !bOk) return -1;
      if (!aOk && bOk) return 1;
      return 0;
    });

    const limited = items.slice(0, MAX_EVENTS);

    return NextResponse.json(
      { events: limited },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (e) {
    console.error("[home/events]", e);
    return NextResponse.json({ events: [] }, { status: 200 });
  }
}
