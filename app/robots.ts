import type { MetadataRoute } from "next";
import { isPublicVenueBookingLive } from "@/lib/site-mode";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://bassik.in";
  const live = isPublicVenueBookingLive();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: live
        ? ["/admin/", "/team/", "/api/"]
        : [
            "/admin/",
            "/team/",
            "/api/",
            "/my-bookings",
            "/*/book",
            "/*/reservations",
            "/*/chat",
            "/*/lead",
            "/*/my-bookings",
          ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
