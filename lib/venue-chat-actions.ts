import { BRANDS } from "@/lib/brands";
import { getDiscountsForBrand } from "@/lib/reservation-discounts";
import type { VenueChatKnowledge } from "@/lib/venue-chat-knowledge";
import {
  appendMessage,
  getLeadSnapshot,
  type ChatLeadSnapshot,
  type ChatMessageDto,
  updateLeadFields,
} from "@/lib/venue-chat-data";
import { bookingPath } from "@/lib/venue-chat-paths";
import { buildBookingLinkMetadata } from "@/lib/venue-chat-booking-link";
import {
  friendlyEventLabel,
  rejectExtractedGuestName,
  sanitizeGuestName,
} from "@/lib/venue-chat-guest";

export { bookingPath } from "@/lib/venue-chat-paths";
export { friendlyEventLabel, sanitizeGuestName } from "@/lib/venue-chat-guest";

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
    text.match(/(?:^|[\s,])(?:my name is|this is|name[:\s-]+)\s*([A-Za-z][A-Za-z\s.'-]{1,35})/i) ??
    text.match(/(?:^|[\s,])i'?m\s+(?!interested\b)([A-Za-z][A-Za-z\s.'-]{1,35})/i) ??
    text.match(/^([A-Za-z][A-Za-z\s.'-]{1,35})\s*[,–—-]/);
  if (named?.[1]) {
    guestName = rejectExtractedGuestName(named[1].trim().replace(/\s+(and|mobile|phone|number).*$/i, "").trim());
  }

  if (!guestName && phone) {
    const stripped = text
      .replace(phone, "")
      .replace(/\d{10}/g, "")
      .replace(/[^\w\s.'-]/g, " ")
      .trim();
    const words = stripped.split(/\s+/).filter(Boolean);
    if (words.length >= 1 && words.length <= 4 && !/^(book|table|hi|hello|yes|ok)$/i.test(words[0])) {
      guestName = rejectExtractedGuestName(words.slice(0, 3).join(" "));
    }
  }

  if (!guestName && !phone) {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length >= 1 && words.length <= 3 && !/^\d/.test(trimmed) && !/interested/i.test(trimmed)) {
      guestName = rejectExtractedGuestName(trimmed);
    }
  }

  if (guestName && guestName.length < 2) guestName = undefined;
  return { guestName, contactNumber: phone ?? undefined };
}

export function resolveExploreUrl(brandId: string, knowledge: VenueChatKnowledge): string {
  const site = knowledge.websiteUrl?.trim();
  if (site && site !== "#" && !site.includes("example.com")) return site;
  return `/${brandId}`;
}

function linkMetadata(url: string, label: string, kind: "booking_link" | "external_link") {
  if (kind === "external_link") return { type: kind, url, label };
  const eventId = url.match(/[?&]eventId=([^&]+)/)?.[1];
  const decoded = eventId ? decodeURIComponent(eventId) : undefined;
  return buildBookingLinkMetadata(url, label, decoded ? "event" : "table", decoded);
}

function bookingLinkMeta(brandId: string, label: string, eventId?: string | null) {
  const path = bookingPath(brandId, eventId);
  return buildBookingLinkMetadata(path, label, eventId ? "event" : "table", eventId);
}

export async function appendBookingLinkMessage(
  leadId: string,
  brandId: string,
  _venueName: string,
  guestName?: string | null,
  eventId?: string | null,
  eventName?: string | null
): Promise<ChatMessageDto> {
  const path = bookingPath(brandId, eventId);
  const name = sanitizeGuestName(guestName);
  const ev = friendlyEventLabel(eventName);
  const line = name
    ? ev !== "this night"
      ? `Perfect, ${name} — you're all set for ${ev}. Tap below when you're ready.`
      : `Perfect, ${name} — you're all set. Tap below when you're ready.`
    : `Perfect — you're all set. Tap below when you're ready.`;
  return appendMessage(
    leadId,
    "ASSISTANT",
    line,
    null,
    bookingLinkMeta(brandId, eventId ? "Book this night →" : "Reserve your table →", eventId)
  );
}
function askNameCopy(eventName?: string | null): string {
  const ev = friendlyEventLabel(eventName);
  if (ev !== "this night") {
    return `Great pick — ${ev} is going to be a vibe. What's your name? I'll sort the rest for you.`;
  }
  return `I'd love to get you a table. What's your name? I'll take care of everything from here.`;
}

function askPhoneCopy(guestName: string, eventName?: string | null): string {
  const name = sanitizeGuestName(guestName) ?? guestName.trim();
  const ev = friendlyEventLabel(eventName);
  if (ev !== "this night") {
    return `Thanks, ${name}! Whenever you're ready, just share your mobile number — I'll lock in ${ev} for you.`;
  }
  return `Lovely to meet you, ${name}. Whenever you're ready, just share your mobile number — I'll sort your table.`;
}

function askNameAndPhoneCopy(eventName?: string | null): string {
  const ev = friendlyEventLabel(eventName);
  if (ev !== "this night") {
    return `Great pick — ${ev} is going to be a vibe. What's your name and mobile number? I'll take it from here.`;
  }
  return `Happy to help! What's your name and mobile number? I'll get your table sorted.`;
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
    const name = sanitizeGuestName(lead.guestName);
    if (lead.contactNumber && name) {
      out.push(
        await appendBookingLinkMessage(
          leadId,
          brandId,
          venue,
          name,
          lead.selectedEventId,
          lead.selectedEventName
        )
      );
      return out;
    }
    if (name && !lead.contactNumber) {
      out.push(await appendMessage(leadId, "ASSISTANT", askPhoneCopy(name, lead.selectedEventName)));
      return out;
    }
    out.push(await appendMessage(leadId, "ASSISTANT", askNameAndPhoneCopy(lead.selectedEventName)));
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
  const existingName = sanitizeGuestName(lead.guestName);
  const updates: { guestName?: string | null; contactNumber?: string } = {};

  if (extracted.contactNumber && !lead.contactNumber) {
    updates.contactNumber = extracted.contactNumber;
  }
  if (extracted.guestName) {
    updates.guestName = extracted.guestName;
  } else if (lead.guestName && !existingName) {
    updates.guestName = null;
  }

  if (!updates.contactNumber && !updates.guestName) return null;

  await updateLeadFields(leadId, { ...updates, status: "BOOKING_STARTED" });
  const snapshot = await getLeadSnapshot(leadId);
  const fresh = snapshot ?? lead;
  const name = sanitizeGuestName(fresh.guestName);
  const messages: ChatMessageDto[] = [];

  if (fresh.contactNumber && name) {
    messages.push(
      await appendBookingLinkMessage(
        leadId,
        brandId,
        knowledge.venueName,
        name,
        fresh.selectedEventId,
        fresh.selectedEventName
      )
    );
    return { messages, leadUpdates: true };
  }

  if (fresh.contactNumber && !name) {
    messages.push(await appendMessage(leadId, "ASSISTANT", askNameCopy(fresh.selectedEventName)));
    return { messages, leadUpdates: true };
  }

  if (name && !fresh.contactNumber) {
    messages.push(await appendMessage(leadId, "ASSISTANT", askPhoneCopy(name, fresh.selectedEventName)));
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

function bookContactAskCopy(_venue: string, _brandId: string, telugu: boolean, eventName?: string | null): string {
  if (telugu) {
    return `Chala bagundi! Me peru cheppandi — table book chesi help chestha.`;
  }
  return askNameCopy(eventName);
}

/** Instant reply when guest taps an event poster — no AI wait. */
export async function tryInstantEventSelectReply(params: {
  leadId: string;
  brandId: string;
  knowledge: VenueChatKnowledge;
  lead: ChatLeadSnapshot;
  eventName: string;
  offerId?: string;
}): Promise<ChatMessageDto[]> {
  const { leadId, brandId, knowledge, lead, eventName, offerId } = params;
  if (!offerId) {
    return [await appendMessage(leadId, "ASSISTANT", askNameCopy(eventName))];
  }

  const title = eventName.split(" · ")[0]?.trim() || eventName;
  const storedName = sanitizeGuestName(lead.guestName);

  await updateLeadFields(leadId, {
    status: "BOOKING_STARTED",
    selectedEventId: offerId,
    selectedEventName: title,
    guestName: storedName,
  });

  const snapshot = await getLeadSnapshot(leadId);
  if (!snapshot) {
    return [await appendMessage(leadId, "ASSISTANT", askNameAndPhoneCopy(title))];
  }

  const name = sanitizeGuestName(snapshot.guestName);

  if (snapshot.contactNumber && name) {
    return [
      await appendBookingLinkMessage(
        leadId,
        brandId,
        knowledge.venueName,
        name,
        snapshot.selectedEventId,
        snapshot.selectedEventName
      ),
    ];
  }

  if (name && !snapshot.contactNumber) {
    return [await appendMessage(leadId, "ASSISTANT", askPhoneCopy(name, snapshot.selectedEventName))];
  }

  return [await appendMessage(leadId, "ASSISTANT", askNameAndPhoneCopy(snapshot.selectedEventName))];
}

/** Text message that looks like a book request — same flow as book_table button. */
export async function tryInstantBookIntentReply(params: {
  leadId: string;
  brandId: string;
  knowledge: VenueChatKnowledge;
  lead: ChatLeadSnapshot;
  userMessage?: string;
}): Promise<ChatMessageDto[] | null> {
  if (params.lead.contactNumber && sanitizeGuestName(params.lead.guestName)) {
    const name = sanitizeGuestName(params.lead.guestName)!;
    return [
      await appendBookingLinkMessage(
        params.leadId,
        params.brandId,
        params.knowledge.venueName,
        name,
        params.lead.selectedEventId,
        params.lead.selectedEventName
      ),
    ];
  }
  await updateLeadFields(params.leadId, { status: "BOOKING_STARTED" });
  const telugu = params.userMessage ? guestWritesTelugu(params.userMessage) : false;
  if (telugu) {
    return [await appendMessage(params.leadId, "ASSISTANT", bookContactAskCopy("", "", true))];
  }
  return handleInstantAction({ ...params, action: "book_table" });
}
