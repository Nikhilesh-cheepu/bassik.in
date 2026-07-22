import type { MetadataRoute } from "next";
import { BRANDS, HIDDEN_BRAND_IDS } from "@/lib/brands";
import { isPublicVenueBookingLive } from "@/lib/site-mode";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://bassik.in";
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  if (isPublicVenueBookingLive()) {
    for (const brand of BRANDS) {
      if (HIDDEN_BRAND_IDS.has(brand.id)) continue;
      entries.push({
        url: `${base}/${brand.id}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
