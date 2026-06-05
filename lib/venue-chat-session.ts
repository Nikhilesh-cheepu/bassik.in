import "server-only";

import { BRANDS } from "@/lib/brands";
import {
  getLeadSnapshot,
  getMessages,
  getOrCreateLead,
  getWeekOffersForBrand,
  seedWelcomeThread,
  type ChatLeadSnapshot,
  type ChatMessageDto,
  type UtmParams,
} from "@/lib/venue-chat-data";
import { getVenueChatKnowledge } from "@/lib/venue-chat-knowledge";

export type ChatSessionPayload = {
  lead: ChatLeadSnapshot;
  messages: ChatMessageDto[];
  sessionToken: string;
  venue: {
    phone: string;
    mapUrl: string | null;
    address: string;
    whatsappMessage: string;
  };
  chat: {
    venueName: string;
    hostName: string | null;
  };
};

export async function loadChatSession(
  brandId: string,
  sessionToken: string | null,
  utm?: UtmParams
): Promise<ChatSessionPayload> {
  const { lead, isNew } = await getOrCreateLead(brandId, sessionToken, utm);

  const [knowledge, offers, existingMessages] = await Promise.all([
    getVenueChatKnowledge(brandId),
    getWeekOffersForBrand(brandId),
    getMessages(lead.id),
  ]);

  let messages = existingMessages;
  if (isNew || messages.length === 0) {
    messages = await seedWelcomeThread(lead.id, brandId, offers, knowledge);
  }

  const fresh = (await getLeadSnapshot(lead.id)) ?? lead;

  return {
    lead: fresh,
    messages,
    sessionToken: fresh.sessionToken,
    venue: {
      phone: knowledge.phone,
      mapUrl: knowledge.mapUrl,
      address: knowledge.address,
      whatsappMessage: knowledge.whatsappMessage,
    },
    chat: {
      venueName: knowledge.venueName,
      hostName: knowledge.hostName,
    },
  };
}

export function resolveBrandId(outletSlug: string): string {
  return BRANDS.some((b) => b.id === outletSlug) ? outletSlug : BRANDS[0].id;
}

export function utmFromSearchParams(sp: Record<string, string | string[] | undefined>): UtmParams {
  const pick = (k: string) => {
    const v = sp[k];
    return typeof v === "string" ? v : null;
  };
  return {
    utmSource: pick("utm_source"),
    utmMedium: pick("utm_medium"),
    utmCampaign: pick("utm_campaign"),
    utmContent: pick("utm_content"),
  };
}
