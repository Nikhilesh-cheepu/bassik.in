import type { Metadata } from "next";
import { cookies } from "next/headers";
import { BRANDS } from "@/lib/brands";
import { getContactForBrand } from "@/lib/outlet-contacts";
import { chatCookieName } from "@/lib/venue-chat-data";
import { getVenueDataByBrandId } from "@/lib/venue-data";
import { loadChatSession, resolveBrandId, utmFromSearchParams } from "@/lib/venue-chat-session";
import ChatLandingClient from "./ChatLandingClient";

export const dynamic = "force-dynamic";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type PageProps = {
  params: Promise<{ outlet: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { outlet } = await params;
  const brandId = resolveBrandId(outlet);
  const brand = BRANDS.find((b) => b.id === brandId);
  const name = brand?.shortName ?? "Venue";
  return {
    title: `Chat with ${name}`,
    description: `Message ${name} — book a table, see events, and get help instantly.`,
  };
}

export default async function ChatLandingPage({ params, searchParams }: PageProps) {
  const { outlet } = await params;
  const sp = await searchParams;
  const brandId = resolveBrandId(outlet);
  const brand = BRANDS.find((b) => b.id === brandId)!;

  const cookieStore = await cookies();
  const token = cookieStore.get(chatCookieName(brandId))?.value ?? null;
  const utm = utmFromSearchParams(sp);

  const [venueData, session] = await Promise.all([
    getVenueDataByBrandId(brandId),
    loadChatSession(brandId, token, utm),
  ]);

  cookieStore.set(chatCookieName(brandId), session.sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return (
    <ChatLandingClient
      brandId={brandId}
      venueShortName={brand.shortName}
      accentColor={brand.accentColor}
      contactPhone={venueData?.contactPhone || getContactForBrand(brandId)}
      whatsappMessage={session.venue.whatsappMessage}
      mapUrl={session.venue.mapUrl}
      address={session.venue.address}
      hasMenus={(venueData?.menus.length ?? 0) > 0}
      initialSnapshot={session}
    />
  );
}
