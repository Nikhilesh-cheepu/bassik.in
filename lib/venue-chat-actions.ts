import { BRANDS } from "@/lib/brands";
import { getDiscountsForBrand } from "@/lib/reservation-discounts";
import type { VenueChatKnowledge } from "@/lib/venue-chat-knowledge";
import {
  appendMessage,
  type ChatLeadSnapshot,
  type ChatMessageDto,
  updateLeadFields,
} from "@/lib/venue-chat-data";

export type ChatActionType =
  | "select_event"
  | "book_table"
  | "ask_menu"
  | "pricing_offers"
  | "explore_website";

export function actionUserMessage(type: ChatActionType): string {
  switch (type) {
    case "book_table":
      return "I'd like to book a table";
    case "ask_menu":
      return "Can you show me the menu?";
    case "pricing_offers":
      return "What are your pricing and offers?";
    case "explore_website":
      return "I'd like to explore your website";
    default:
      return "";
  }
}

export function isInstantAction(type: ChatActionType): boolean {
  return type !== "select_event";
}

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = raw.replace(/\D/g, "").slice(-10);
  return d.length === 10 && /^[6-9]/.test(d) ? d : null;
}

export function tryExtractContactFromMessage(text: string): {
  guestName?: string;
  contactNumber?: string;
} {
  const phone = normalizePhone(text);
  let guestName: string | undefined;

  const named =
    text.match(/(?:^|[\s,])(?:i'?m|my name is|this is|name[:\s-]+)\s*([A-Za-z][A-Za-z\s.'-]{1,35})/i) ??
    text.match(/^([A-Za-z][A-Za-z\s.'-]{1,35})\s*[,–—-]/);
  if (named?.[1]) {
    guestName = named[1].trim().replace(/\s+(and|mobile|phone|number).*$/i, "").trim();
  }

  if (!guestName && phone) {
    const stripped = text
      .replace(phone, "")
      .replace(/\d{10}/g, "")
      .replace(/[^\w\s.'-]/g, " ")
      .trim();
    const words = stripped.split(/\s+/).filter(Boolean);
    if (words.length >= 1 && words.length <= 4 && !/^(book|table|hi|hello|yes|ok)$/i.test(words[0])) {
      guestName = words.slice(0, 3).join(" ");
    }
  }

  if (guestName && guestName.length < 2) guestName = undefined;
  return { guestName, contactNumber: phone ?? undefined };
}

export function bookingPath(brandId: string): string {
  return `/${brandId}/book`;
}

export function resolveExploreUrl(brandId: string, knowledge: VenueChatKnowledge): string {
  const site = knowledge.websiteUrl?.trim();
  if (site && site !== "#" && !site.includes("example.com")) return site;
  return `/${brandId}`;
}

function linkMetadata(url: string, label: string, kind: "booking_link" | "external_link") {
  return { type: kind, url, label };
}

export async function appendBookingLinkMessage(
  leadId: string,
  brandId: string,
  venueName: string,
  guestName?: string | null
): Promise<ChatMessageDto> {
  const path = bookingPath(brandId);
  const discounts = getDiscountsForBrand(brandId);
  const offerLine =
    discounts.length > 0
      ? "\n\nDon't forget to select an offer while booking — we've got deals running."
      : "";
  const greet = guestName?.trim() ? `You're all set, ${guestName.trim()}!` : "You're all set!";
  return appendMessage(
    leadId,
    "ASSISTANT",
    `${greet} Tap below to book your table at ${venueName}.${offerLine}`,
    null,
    linkMetadata(path, "Book your table →", "booking_link")
  );
}

export async function handleInstantAction(params: {
  leadId: string;
  brandId: string;
  action: ChatActionType;
  knowledge: VenueChatKnowledge;
  lead: ChatLeadSnapshot;
}): Promise<ChatMessageDto[]> {
  const { leadId, brandId, action, knowledge, lead } = params;
  const venue = knowledge.venueName;
  const out: ChatMessageDto[] = [];

  if (action === "book_table") {
    await updateLeadFields(leadId, { status: "BOOKING_STARTED" });
    if (lead.contactNumber && lead.guestName) {
      out.push(await appendBookingLinkMessage(leadId, brandId, venue, lead.guestName));
      return out;
    }
    out.push(
      await appendMessage(
        leadId,
        "ASSISTANT",
        bookContactAskCopy(venue, brandId, false)
      )
    );
    return out;
  }

  if (action === "pricing_offers") {
    const discounts = getDiscountsForBrand(brandId);
    if (discounts.length === 0) {
      out.push(
        await appendMessage(
          leadId,
          "ASSISTANT",
          `Offers change by the night at ${venue}. Share your date and party size, or book below and we'll apply the best deal available.`,
          null,
          linkMetadata(bookingPath(brandId), "Book a table →", "booking_link")
        )
      );
      return out;
    }
    const lines = discounts
      .slice(0, 6)
      .map((d) => `• ${d.label}${d.description ? ` (${d.description})` : ""}`)
      .join("\n");
    out.push(
      await appendMessage(
        leadId,
        "ASSISTANT",
        `Here's what's running at ${venue}:\n\n${lines}\n\nBook below and select your offer on the booking page.`,
        null,
        linkMetadata(bookingPath(brandId), "Book & pick offers →", "booking_link")
      )
    );
    return out;
  }

  if (action === "explore_website") {
    const url = resolveExploreUrl(brandId, knowledge);
    const brand = BRANDS.find((b) => b.id === brandId);
    out.push(
      await appendMessage(
        leadId,
        "ASSISTANT",
        `Explore ${brand?.shortName ?? venue} — menus, vibes, events and more. Tap below to browse.`,
        null,
        linkMetadata(url, "Explore website →", "external_link")
      )
    );
    return out;
  }

  if (action === "ask_menu") {
    out.push(
      await appendMessage(
        leadId,
        "ASSISTANT",
        knowledge.menus.length
          ? `We have ${knowledge.menus.map((m) => m.name).join(", ")} on the menu. Want to browse on the site, or tell me what you're in the mood for?`
          : `Happy to talk you through the menu — what kind of food or drinks are you looking for?`
      )
    );
    return out;
  }

  return out;
}

/** After guest shares name/phone in chat — instant booking link, no AI wait. */
export async function tryInstantContactCaptureReply(params: {
  leadId: string;
  brandId: string;
  knowledge: VenueChatKnowledge;
  lead: ChatLeadSnapshot;
  userMessage: string;
}): Promise<{ messages: ChatMessageDto[]; leadUpdates: boolean } | null> {
  const { leadId, brandId, knowledge, lead, userMessage } = params;
  const extracted = tryExtractContactFromMessage(userMessage);
  const updates: { guestName?: string; contactNumber?: string } = {};

  if (extracted.contactNumber && !lead.contactNumber) {
    updates.contactNumber = extracted.contactNumber;
  }
  if (extracted.guestName && !lead.guestName) {
    updates.guestName = extracted.guestName;
  }

  if (!updates.contactNumber && !updates.guestName) return null;

  await updateLeadFields(leadId, { ...updates, status: "BOOKING_STARTED" });
  const fresh = {
    ...lead,
    guestName: updates.guestName ?? lead.guestName,
    contactNumber: updates.contactNumber ?? lead.contactNumber,
  };

  const messages: ChatMessageDto[] = [];

  if (fresh.contactNumber && fresh.guestName) {
    messages.push(await appendBookingLinkMessage(leadId, brandId, knowledge.venueName, fresh.guestName));
    return { messages, leadUpdates: true };
  }

  if (fresh.contactNumber && !fresh.guestName) {
    messages.push(
      await appendMessage(leadId, "ASSISTANT", "Got your number — what's your name? Then I'll send the booking link.")
    );
    return { messages, leadUpdates: true };
  }

  if (fresh.guestName && !fresh.contactNumber) {
    messages.push(
      await appendMessage(
        leadId,
        "ASSISTANT",
        `Thanks, ${fresh.guestName}! Share your 10-digit mobile number and I'll send your booking link.`
      )
    );
    return { messages, leadUpdates: true };
  }

  return null;
}

export function guestWritesTelugu(text: string): boolean {
  return /[\u0C00-\u0C7F]/.test(text) || /\b(ala|ela|eppudu|cheyy|cheddam|peru|number|ivvandi|pamp)\b/i.test(text);
}

export function guestIsBookHowQuestion(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (/how\s+(do\s+(we|i)|can\s+(we|i)|to)\s+book/i.test(t)) return true;
  if (/how\s+.*\bbook\b.*\btable\b/i.test(t)) return true;
  if (/\b(booking\s+(process|link|steps?)|where\s+(do|can)\s+(i|we)\s+book)\b/i.test(t)) return true;
  if (/[\u0C00-\u0C7F]/.test(text)) {
    if (/(ala|ela|eppudu).*(book|cheyy|ched)/i.test(t)) return true;
    if (/(book|cheyy|ched).*(ala|ela|eppudu)/i.test(t)) return true;
    if (/\b(book|table|reserve)\b/i.test(t) && /(ela|ala|cheyy|ched)/i.test(t)) return true;
  }
  return false;
}

export function guestIsBookingIntent(text: string): boolean {
  if (guestIsBookHowQuestion(text)) return true;
  return /\b(book(ing)?\s*(a\s*)?table|reserve\s*(a\s*)?table|table\s+(book|for|kavali)|i'd like to book|book\s+cheyy|book\s+ched)\b/i.test(
    text
  );
}

function bookContactAskCopy(venue: string, brandId: string, telugu: boolean): string {
  const offerTip =
    getDiscountsForBrand(brandId).length > 0
      ? telugu
        ? "\n\nTip: Booking page lo offer select cheyochu."
        : "\n\nTip: Pick an offer on the booking page if one's available."
      : "";
  if (telugu) {
    return `Sure — ${venue} lo table book cheyadaniki easy.\n\nMe peru mariyu 10-digit mobile number ivvandi — booking link instant ga pampistha.${offerTip}`;
  }
  return `Perfect — let's get you a table at ${venue}.\n\nShare your name and 10-digit mobile number here, and I'll send your booking link right away.${offerTip}`;
}

/** Text message that looks like a book request — same flow as book_table button. */
export async function tryInstantBookIntentReply(params: {
  leadId: string;
  brandId: string;
  knowledge: VenueChatKnowledge;
  lead: ChatLeadSnapshot;
  userMessage?: string;
}): Promise<ChatMessageDto[] | null> {
  if (params.lead.contactNumber && params.lead.guestName) {
    return [
      await appendBookingLinkMessage(
        params.leadId,
        params.brandId,
        params.knowledge.venueName,
        params.lead.guestName
      ),
    ];
  }
  await updateLeadFields(params.leadId, { status: "BOOKING_STARTED" });
  const telugu = params.userMessage ? guestWritesTelugu(params.userMessage) : false;
  if (telugu) {
    return [
      await appendMessage(
        params.leadId,
        "ASSISTANT",
        bookContactAskCopy(params.knowledge.venueName, params.brandId, true)
      ),
    ];
  }
  return handleInstantAction({ ...params, action: "book_table" });
}
