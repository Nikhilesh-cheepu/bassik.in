import type { Metadata } from "next";
import { BRANDS } from "@/lib/brands";
import { loadChatLandingPageProps } from "@/lib/chat-landing-server";
import { resolveBrandId } from "@/lib/venue-chat-session";
import EmbedChatClient from "./EmbedChatClient";

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
  return {
    title: `Chat with ${name}`,
    robots: { index: false, follow: false },
  };
}

export default async function ChatEmbedPage({ params, searchParams }: PageProps) {
  const { outlet } = await params;
  const sp = await searchParams;
  const props = await loadChatLandingPageProps(outlet, sp);
  return <EmbedChatClient {...props} />;
}
