import { prisma } from "@/lib/db";

export type SiteGalleryRecord = {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
};

function mapRow(r: {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
}): SiteGalleryRecord {
  return { id: r.id, url: r.url, alt: r.alt, sortOrder: r.sortOrder };
}

/** Ordered full list for /gallery — empty array if DB unavailable or migrated out. */
export async function getGalleryImages(): Promise<SiteGalleryRecord[]> {
  try {
    const rows = await prisma.galleryImage.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return rows.map(mapRow);
  } catch (e) {
    console.warn("[site-gallery] getGalleryImages failed:", e);
    return [];
  }
}

/** Home teaser — capped list, same ordering. Default 14. */
export async function getGalleryPreviewImages(
  limit: number = 14
): Promise<SiteGalleryRecord[]> {
  try {
    const rows = await prisma.galleryImage.findMany({
      orderBy: { sortOrder: "asc" },
      take: Math.max(0, Math.min(limit, 50)),
    });
    return rows.map(mapRow);
  } catch (e) {
    console.warn("[site-gallery] getGalleryPreviewImages failed:", e);
    return [];
  }
}
