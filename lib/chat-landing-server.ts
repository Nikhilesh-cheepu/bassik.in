import "server-only";

import { cookies } from "next/headers";
import { BRANDS } from "@/lib/brands";
import { getContactForBrand } from "@/lib/outlet-contacts";
import { chatCookieName } from "@/lib/venue-chat-data";
import { getVenueDataByBrandId } from "@/lib/venue-data";
import { loadChatSession, resolveBrandId, utmFromSearchParams } from "@/lib/venue-chat-session";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

async function loadChatPageProps(
  outlet: string,
  searchParams: Record<string, string | string[] | undefined>,
  options: { persistSessionCookie: boolean }
) {
  const brandId = resolveBrandId(outlet);
  const brand = BRANDS.find((b) => b.id === brandId)!;

  const cookieStore = await cookies();
  const token = cookieStore.get(chatCookieName(brandId))?.value ?? null;
  const utm = utmFromSearchParams(searchParams);

  const [venueData, session] = await Promise.all([
    getVenueDataByBrandId(brandId),
    loadChatSession(brandId, token, utm),
  ]);

  // Embed iframes cannot set cookies during RSC render — client calls /api/venues/.../chat instead.
  if (options.persistSessionCookie) {
    cookieStore.set(chatCookieName(brandId), session.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
  }

  return {
    brandId,
    venueShortName: brand.shortName,
    accentColor: brand.accentColor,
    contactPhone: venueData?.contactPhone || getContactForBrand(brandId),
    whatsappMessage: session.venue.whatsappMessage,
    mapUrl: session.venue.mapUrl,
    address: session.venue.address,
    hasMenus: (venueData?.menus.length ?? 0) > 0,
    initialSnapshot: session,
  };
}

export async function loadChatLandingPageProps(
  outlet: string,
  searchParams: Record<string, string | string[] | undefined>
) {
  return loadChatPageProps(outlet, searchParams, { persistSessionCookie: true });
}

/** Firefly / partner sites iframe this route — no cookie writes in RSC. */
export async function loadChatEmbedPageProps(
  outlet: string,
  searchParams: Record<string, string | string[] | undefined>
) {
  return loadChatPageProps(outlet, searchParams, { persistSessionCookie: false });
}
