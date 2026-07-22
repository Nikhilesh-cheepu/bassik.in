import type { Metadata } from "next";
import { BRANDS } from "@/lib/brands";
import { loadChatLandingPageProps } from "@/lib/chat-landing-server";
import { isPublicVenueBookingLive } from "@/lib/site-mode";
import { resolveBrandId } from "@/lib/venue-chat-session";
import ChatLandingClient from "./ChatLandingClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ outlet: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { outlet } = await params;
  const brandId = resolveBrandId(outlet);
  const brand = BRANDS.find((b) => b.id === brandId);
  const name = brand?.shortName ?? "Venue";
  const live = isPublicVenueBookingLive();
  return {
    title: `Chat with ${name}`,
    description: `Message ${name} — book a table, see events, and get help instantly.`,
    robots: live ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default async function ChatLandingPage({ params, searchParams }: PageProps) {
  const { outlet } = await params;
  const sp = await searchParams;
  const props = await loadChatLandingPageProps(outlet, sp);
  return <ChatLandingClient {...props} />;
}
