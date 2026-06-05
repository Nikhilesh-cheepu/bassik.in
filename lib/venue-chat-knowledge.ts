import { BRANDS } from "@/lib/brands";
import { getContactForBrand, getWhatsAppMessageForBrand } from "@/lib/outlet-contacts";
import { getDiscountsForBrand } from "@/lib/reservation-discounts";
import {
  clubRogueChatVenueName,
  isClubRogueBrand,
  CLUB_ROGUE_COVER_CHAT_LINE,
} from "@/lib/club-rogue";
import { getVenueChatConfig, updateVenueChatConfig } from "@/lib/venue-chat-config";
import { prisma } from "@/lib/db";
import type { WeekOffer } from "@/lib/venue-chat-data";

export type VenueChatKnowledge = {
  brandId: string;
  venueName: string;
  fullName: string;
  description: string;
  phone: string;
  whatsappMessage: string;
  address: string;
  mapUrl: string | null;
  menus: { id: string; name: string }[];
  instagramUrl: string | null;
  websiteUrl: string | null;
  hostName: string | null;
};

const DEFAULT_MAP = "https://maps.app.goo.gl/wD2TKLaW9v5gFnmj6";

export async function getVenueChatKnowledge(brandId: string): Promise<VenueChatKnowledge> {
  const brand = BRANDS.find((b) => b.id === brandId);
  const fallbackPhone = getContactForBrand(brandId);
  const fallbackName = brand?.shortName ?? brandId;

  const venue = await prisma.venue.findUnique({
    where: { brandId },
    include: {
      menus: { select: { id: true, name: true }, orderBy: { name: "asc" }, take: 12 },
    },
  });

  const phone =
    (venue as { contactPhone?: string | null } | null)?.contactPhone?.trim() || fallbackPhone;
  const address = venue?.address?.trim() ?? "";
  const mapUrl = venue?.mapUrl?.trim() || DEFAULT_MAP;
  const menus = venue?.menus.map((m) => ({ id: m.id, name: m.name })) ?? [];
  const chatCfg = await getVenueChatConfig(brandId);
  const hostName = chatCfg.hostName;

  const dbFull = venue?.name?.trim() || brand?.name || fallbackName;
  const rogueChatName = clubRogueChatVenueName(brandId);
  const chatVenueName =
    rogueChatName ?? (venue?.shortName?.trim() || brand?.shortName || fallbackName);

  return {
    brandId,
    venueName: chatVenueName,
    fullName: rogueChatName ?? dbFull,
    description: brand?.description?.trim() ?? "",
    phone,
    whatsappMessage: getWhatsAppMessageForBrand(brandId, fallbackName),
    address,
    mapUrl,
    menus,
    instagramUrl: brand?.instagramUrls?.[0]?.trim() || null,
    websiteUrl: brand?.websiteUrl && brand.websiteUrl !== "#" ? brand.websiteUrl : null,
    hostName,
  };
}

export async function updateChatHostName(
  brandId: string,
  hostName: string | null
): Promise<{ hostName: string | null }> {
  const cfg = await updateVenueChatConfig(brandId, { hostName });
  return { hostName: cfg.hostName };
}

export function buildVenueKnowledgePrompt(
  knowledge: VenueChatKnowledge,
  offers: WeekOffer[]
): string {
  const eventLines = offers.map((o) => {
    const bits = [
      `id=${o.id}`,
      o.title ?? "Event",
      o.dateLine,
      o.description?.trim(),
      o.entryLabel ? `entry: ${o.entryLabel}` : null,
      o.capacityText ? `capacity: ${o.capacityText}` : null,
    ].filter(Boolean);
    return bits.join(" | ");
  });

  const menuLines = knowledge.menus.length
    ? knowledge.menus.map((m) => `- ${m.name} (id: ${m.id})`).join("\n")
    : "(menus on request — point guest to menu on site)";

  const discounts = getDiscountsForBrand(knowledge.brandId);
  const discountLines = discounts.length
    ? discounts
        .map((d) => `- id: ${d.id} | ${d.label}${d.description ? ` (${d.description})` : ""}`)
        .join("\n")
    : "No preset discount codes — mention best available deal for their night.";

  const venueLine = isClubRogueBrand(knowledge.brandId)
    ? `Venue: ${knowledge.fullName} — always use this full name in replies; never say only the locality (e.g. never "Gachibowli" alone).`
    : `Venue: ${knowledge.fullName} (${knowledge.venueName})`;

  return [
    venueLine,
    knowledge.description ? `Vibe: ${knowledge.description}` : "",
    knowledge.address ? `Address: ${knowledge.address}` : "",
    knowledge.mapUrl ? `Directions: ${knowledge.mapUrl}` : "",
    `Phone: ${knowledge.phone}`,
    knowledge.instagramUrl ? `Instagram: ${knowledge.instagramUrl}` : "",
    knowledge.websiteUrl ? `Website: ${knowledge.websiteUrl}` : "",
    "Menus available:",
    menuLines,
    "Events this week:",
    eventLines.length ? eventLines.join("\n") : "(none listed — still help with table booking)",
    "Discounts (guest picks by id):",
    discountLines,
    isClubRogueBrand(knowledge.brandId)
      ? [
          "Positioning: one of Hyderabad's most happening clubs — premium crowd and big nights.",
          "Cover charge (Club Rogue only):",
          CLUB_ROGUE_COVER_CHAT_LINE,
          "Collected at the venue on arrival — not online. Fully redeemable on food & drinks.",
        ].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildQuickActionsMetadata(knowledge: VenueChatKnowledge) {
  const actions: Record<string, unknown>[] = [
    { id: "call", type: "call", label: "Call us", phone: knowledge.phone },
    {
      id: "whatsapp",
      type: "whatsapp",
      label: "WhatsApp",
      phone: knowledge.phone,
      message: knowledge.whatsappMessage,
    },
  ];
  if (knowledge.mapUrl) {
    actions.push({
      id: "directions",
      type: "directions",
      label: "Directions",
      url: knowledge.mapUrl,
      address: knowledge.address,
    });
  }
  if (knowledge.menus.length > 0) {
    actions.push({ id: "menu", type: "menu", label: "View menu" });
  }
  actions.push({ id: "pricing", type: "pricing", label: "Pricing & offers" });
  actions.push({ id: "website", type: "website", label: "Explore website" });
  actions.push({ id: "book", type: "book", label: "Book a table" });
  return { type: "quick_actions", actions };
}
