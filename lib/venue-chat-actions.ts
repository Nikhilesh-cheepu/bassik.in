import { BRANDS } from "@/lib/brands";
import { getDiscountsForBrand } from "@/lib/reservation-discounts";
import type { VenueChatKnowledge } from "@/lib/venue-chat-knowledge";
import { bookingPath } from "@/lib/venue-chat-paths";
import { buildBookingLinkMetadata, parseBookingLinkMetadata } from "@/lib/venue-chat-booking-link";
import { buildBookingPrefillFromLead, applyMessageBookingContext, formatHumanBookingDate } from "@/lib/venue-chat-booking-policy";
import {
  appendMessage,
  getLeadSnapshot,
  getMessages,
  type ChatLeadSnapshot,
  type ChatMessageDto,
  updateLeadFields,
} from "@/lib/venue-chat-data";
import {
  clubRogueBeforeBookingAskCopy,
  clubRogueBookingLinkIntro,
  clubRogueAskPhoneCopy,
  isClubRogueBrand,
} from "@/lib/club-rogue";
import { formatNameAndPhoneAsk, formatNameAsk, formatPhoneAsk } from "@/lib/venue-chat-copy";
import {
  friendlyEventLabel,
  looksLikePlausibleGuestName,
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

function findPhoneInText(text: string): { phone: string; span: string } | null {
  const structured = text.match(
    /(?:^|\n)\s*(?:contact\s*(?:num|number|no)?|mobile|phone|number)\s*[:-]+\s*([\d\s+-]{10,})/im
  );
  if (structured?.[1]) {
    const phone = normalizePhone(structured[1]);
    if (phone) return { phone, span: structured[0] };
  }

  for (const m of text.matchAll(/\d[\d\s+-]{8,}\d/g)) {
    const phone = normalizePhone(m[0]);
    if (phone) return { phone, span: m[0] };
  }

  for (const m of text.matchAll(/\d[\d\s+-]*/g)) {
    const phone = normalizePhone(m[0]);
    if (phone) return { phone, span: m[0] };
  }

  return null;
}

function stripPhoneFromText(text: string, phone: string): string {
  let out = text;
  for (const m of text.matchAll(/\d[\d\s+-]*/g)) {
    if (normalizePhone(m[0]) === phone) {
      out = out.replace(m[0], " ");
    }
  }
  return out;
}

export function tryExtractContactFromMessage(text: string): {
  guestName?: string;
  contactNumber?: string;
} {
  const trimmed = text.trim();
  if (!trimmed) return {};

  const lines = trimmed.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2) {
    let phone: string | undefined;
    const nameParts: string[] = [];
    for (const line of lines) {
      const linePhone = findPhoneInText(line)?.phone ?? normalizePhone(line);
      if (linePhone && line.replace(/\D/g, "").length >= 10) {
        phone = linePhone;
        continue;
      }
      const name = rejectExtractedGuestName(line);
      if (name) nameParts.push(name);
    }
    if (phone && nameParts.length > 0) {
      return { guestName: nameParts.join(" "), contactNumber: phone };
    }
  }

  const found = findPhoneInText(trimmed);
  const phone = found?.phone ?? normalizePhone(trimmed);

  let guestName: string | undefined;

  const structuredName = trimmed.match(
    /(?:^|\n)\s*name\s*[:-]+\s*([A-Za-z][A-Za-z\s.'-]{1,35})/im
  )?.[1];
  if (structuredName) {
    guestName = rejectExtractedGuestName(structuredName.trim());
  }

  const named =
    trimmed.match(/(?:^|[\s,])(?:my name is|this is|i am|name[:\s-]+)\s*([A-Za-z][A-Za-z\s.'-]{1,35})/i) ??
    trimmed.match(/(?:^|[\s,])i'?m\s+(?!interested\b)([A-Za-z][A-Za-z\s.'-]{1,35})/i) ??
    trimmed.match(/^([A-Za-z][A-Za-z\s.'-]{1,35})\s*[,–—-]/);
  if (!guestName && named?.[1]) {
    guestName = rejectExtractedGuestName(
      named[1].trim().replace(/\s+(and|mobile|phone|number).*$/i, "").trim()
    );
  }

  if (!guestName && phone) {
    const stripped = stripPhoneFromText(trimmed, phone)
      .replace(/(?:^|\n)\s*(?:name|contact\s*(?:num|number|no)?|mobile|phone)\s*[:-]+[^\n]*/gim, " ")
      .replace(/[^\w\s.'-]/g, " ")
      .trim();
    const words = stripped.split(/\s+/).filter(Boolean);
    if (words.length >= 1 && words.length <= 3 && !/^(book|table|hi|hello|yes|ok)$/i.test(words[0])) {
      const candidate = rejectExtractedGuestName(words.slice(0, 3).join(" "));
      if (candidate) guestName = candidate;
    }
  }

  if (!guestName && !phone) {
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length === 1 && looksLikePlausibleGuestName(trimmed)) {
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

function bookingLinkMeta(brandId: string, label: string, lead: ChatLeadSnapshot) {
  const prefill = buildBookingPrefillFromLead(lead);
  const path = bookingPath(brandId, prefill);
  const kind = prefill.eventId ? "event" : "table";
  return buildBookingLinkMetadata(path, label, kind, prefill.eventId);
}

function bookingLinkButtonLabel(lead: ChatLeadSnapshot): string {
  if (lead.bookingDate && /^\d{4}-\d{2}-\d{2}$/.test(lead.bookingDate)) {
    const [y, mo, d] = lead.bookingDate.split("-").map(Number);
    const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
    const short = dt.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    return `Book for ${short} →`;
  }
  if (lead.selectedEventId) return "Book this event →";
  return "Reserve your table →";
}

function bookingLinkIntroCopy(
  brandId: string,
  guestName: string | null | undefined,
  lead: ChatLeadSnapshot
): string {
  const name = sanitizeGuestName(guestName);
  const greeting = name ? `${name}, ` : "";
  const partyHint = lead.partySize ? ` for ${lead.partySize}` : "";

  if (lead.bookingDate && /^\d{4}-\d{2}-\d{2}$/.test(lead.bookingDate)) {
    const when = formatHumanBookingDate(lead.bookingDate);
    if (isClubRogueBrand(brandId)) {
      return name
        ? `Got it, ${name} — ${when}${partyHint}. Tap below to pick your time (₹2k redeemable cover at the venue).`
        : `${when}${partyHint} — tap below to pick your time.`;
    }
    return `Got it — ${greeting}tap below to pick your time on ${when}${partyHint}. Only live future slots show on our booking page.`;
  }

  const eventName = lead.selectedEventName;
  if (isClubRogueBrand(brandId) && name) {
    return clubRogueBookingLinkIntro(name, eventName, undefined);
  }
  const ev = friendlyEventLabel(eventName);
  if (name && ev !== "this night") {
    return `${name}, tap below to pick your slot for ${ev} — live times only on our booking page.`;
  }
  if (name) {
    return `${name}, tap below to pick your date & time — today, this weekend, or any open day ahead.`;
  }
  return `Tap below to pick your date & time on our booking page.`;
}

export async function appendBookingLinkMessage(
  leadId: string,
  brandId: string,
  _venueName: string,
  lead: ChatLeadSnapshot
): Promise<ChatMessageDto> {
  const name = sanitizeGuestName(lead.guestName);
  const line = bookingLinkIntroCopy(brandId, name, lead);
  return appendMessage(
    leadId,
    "ASSISTANT",
    line,
    null,
    bookingLinkMeta(brandId, bookingLinkButtonLabel(lead), lead)
  );
}

/** After AI or contact capture — send booking link when name + phone are ready. Refreshes if date/context changed. */
export async function maybeSendBookingLinkIfReady(params: {
  leadId: string;
  brandId: string;
  lead: ChatLeadSnapshot;
  bookingIntent: boolean;
}): Promise<ChatMessageDto | null> {
  const name = sanitizeGuestName(params.lead.guestName);
  const phone = params.lead.contactNumber?.replace(/\D/g, "").slice(-10);
  if (!name || !phone || phone.length !== 10) return null;
  if (!params.bookingIntent && params.lead.status !== "BOOKING_STARTED") return null;

  const newPath = bookingPath(params.brandId, buildBookingPrefillFromLead(params.lead));
  const msgs = await getMessages(params.leadId);
  for (let i = msgs.length - 1; i >= Math.max(0, msgs.length - 8); i--) {
    const parsed = parseBookingLinkMetadata(msgs[i].metadata);
    if (!parsed) continue;
    if (parsed.url === newPath) return null;
    break;
  }

  return appendBookingLinkMessage(params.leadId, params.brandId, "", params.lead);
}
function askNameCopy(brandId: string, eventName?: string | null): string {
  if (isClubRogueBrand(brandId)) {
    return formatNameAsk(
      "Almost there 😊",
      "Then I'll send you to pick your slot ✨"
    );
  }
  const ev = friendlyEventLabel(eventName);
  if (ev !== "this night") {
    return formatNameAsk(
      `Thanks — just need your name for ${ev} 🎉`,
      "I'll sort the rest for you ✨"
    );
  }
  return formatNameAsk(
    "Thanks 😊",
    "I'll take care of everything from here ✨"
  );
}

function askPhoneCopy(
  brandId: string,
  guestName: string,
  lead?: Pick<ChatLeadSnapshot, "selectedEventName" | "bookingDate">
): string {
  if (isClubRogueBrand(brandId)) return clubRogueAskPhoneCopy(guestName);
  const name = sanitizeGuestName(guestName) ?? guestName.trim();
  if (lead?.bookingDate) {
    const when = formatHumanBookingDate(lead.bookingDate);
    return formatPhoneAsk(
      `Lovely, ${name} 😊`,
      `I'll send you to pick a time on ${when}.`
    );
  }
  const ev = friendlyEventLabel(lead?.selectedEventName);
  if (ev !== "this night") {
    return formatPhoneAsk(
      `Thanks, ${name} 😊`,
      `Then I'll send you to pick ${ev} on our booking page.`
    );
  }
  return formatPhoneAsk(
    `Lovely to meet you, ${name} 😊`,
    "I'll send you to our booking page to pick a slot."
  );
}

function askNameAndPhoneCopy(brandId: string, eventName?: string | null): string {
  if (isClubRogueBrand(brandId)) return clubRogueBeforeBookingAskCopy(eventName);
  const ev = friendlyEventLabel(eventName);
  if (ev !== "this night") {
    return formatNameAndPhoneAsk(
      `Great pick — ${ev} is going to be a vibe 🎉`,
      "I'll send you to pick a date & time ✨"
    );
  }
  return formatNameAndPhoneAsk(
    "Happy to help — today, this weekend, or any day ahead 😊",
    "I'll send you to our booking page ✨"
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
    const name = sanitizeGuestName(lead.guestName);
    if (lead.contactNumber && name) {
      const fresh = (await getLeadSnapshot(leadId)) ?? lead;
      out.push(await appendBookingLinkMessage(leadId, brandId, venue, fresh));
      return out;
    }
    if (name && !lead.contactNumber) {
      out.push(await appendMessage(leadId, "ASSISTANT", askPhoneCopy(brandId, name, lead)));
      return out;
    }
    out.push(await appendMessage(leadId, "ASSISTANT", askNameAndPhoneCopy(brandId, lead.selectedEventName)));
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

  if (Object.keys(updates).length === 0) return null;

  const hints = applyMessageBookingContext(userMessage);
  const merged = { ...updates, ...hints };

  await updateLeadFields(leadId, { ...merged, status: "BOOKING_STARTED" });
  const snapshot = await getLeadSnapshot(leadId);
  const fresh = snapshot ?? lead;
  const name = sanitizeGuestName(fresh.guestName);
  const messages: ChatMessageDto[] = [];

  if (fresh.contactNumber && name) {
    messages.push(await appendBookingLinkMessage(leadId, brandId, knowledge.venueName, fresh));
    return { messages, leadUpdates: true };
  }

  if (fresh.contactNumber && !name) {
    messages.push(await appendMessage(leadId, "ASSISTANT", askNameCopy(brandId, fresh.selectedEventName)));
    return { messages, leadUpdates: true };
  }

  if (name && !fresh.contactNumber) {
    messages.push(await appendMessage(leadId, "ASSISTANT", askPhoneCopy(brandId, name, fresh)));
    return { messages, leadUpdates: true };
  }

  if (!name && !fresh.contactNumber) {
    messages.push(await appendMessage(leadId, "ASSISTANT", askNameAndPhoneCopy(brandId, fresh.selectedEventName)));
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
  const t = text.trim();
  if (!t) return false;

  // Explicit book / reserve / table
  if (
    /\b(book(ing)?|reserve|reservation)\b/i.test(t) &&
    /\b(table|slot|entry|guest\s*list|cover|night)\b/i.test(t)
  ) {
    return true;
  }
  if (/\b(i('d| would)? like to|want to|need to|can i|could we|shall we)\s+(book|reserve|get)\b/i.test(t)) {
    return true;
  }
  if (/\btable\s+(for|book|kavali|booking)\b/i.test(t)) return true;
  if (/\b(book|reserve)\s+(a\s+)?table\b/i.test(t)) return true;

  // Date + visit intent (today through any future planning)
  const hasWhen =
    /\b(tonight|today|tomorrow|this\s+(evening|weekend|week|friday|saturday|sunday|monday|tuesday|wednesday|thursday)|next\s+(week|weekend|friday|saturday|sunday|month)|day after tomorrow|\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))\b/i.test(
      t
    ) || /\b20\d{2}-\d{2}-\d{2}\b/.test(t);
  const hasVisit =
    /\b(table|party|people|pax|guests?|cover|entry|come|visit|planning|celebrat|birthday|anniversary|office|corporate|group)\b/i.test(
      t
    );
  if (hasWhen && hasVisit) return true;

  // Headcount + implicit booking
  if (/\b(for|party\s+of)\s+\d{1,2}\b/i.test(t) && /\b(table|book|reserve|tonight|tomorrow|weekend|friday|saturday|sunday)\b/i.test(t)) {
    return true;
  }

  // Telugu / Hinglish
  if (/[\u0C00-\u0C7F]/.test(t)) {
    if (/\b(book|table|reserve|slot)\b/i.test(t)) return true;
    if (/(book|cheyy|ched|table|slot|reserv)/i.test(t) && /(kavali|chey|undhi|vastha|vastham|karo|chahiye)/i.test(t)) {
      return true;
    }
    if (/(tonight|today|tomorrow|repu|ee roju|weekend|friday|saturday)/i.test(t) && /(table|party|people|vastha)/i.test(t)) {
      return true;
    }
  }

  if (/\b(guest\s*list|bottle\s*service|vip\s*table)\b/i.test(t) && /\b(book|need|want|get|reserve)\b/i.test(t)) {
    return true;
  }

  return false;
}

function bookContactAskCopy(_venue: string, brandId: string, telugu: boolean, eventName?: string | null): string {
  if (telugu) {
    return formatNameAndPhoneAsk(
      "Chala bagundi! 😊",
      "Table book chesi help chestha ✨"
    );
  }
  return askNameAndPhoneCopy(brandId, eventName);
}

export function guestIsAcknowledgment(text: string): boolean {
  return /^(ok|okay|k|sure|yes|yeah|yep|yup|fine|cool|great|alright|done|got it|sounds good|perfect|👍|✅)$/i.test(
    text.trim().replace(/[!.\s]+$/g, "")
  );
}

function guestLooksLikeDatePick(text: string): boolean {
  const t = text.trim();
  if (/^\d{1,2}(?:st|nd|rd|th)?\.?$/i.test(t)) return true;
  return Object.keys(applyMessageBookingContext(t)).length > 0;
}

function guestLooksLikeFactualQuestion(text: string): boolean {
  if (!/\?/.test(text)) return false;
  return /\b(cover|charge|price|menu|time|where|when|what|how|cost|parking|dress|vibe|offer|event)\b/i.test(
    text
  );
}

/** Deterministic contact ask — same layout every time during booking flow. */
export async function tryInstantBookingContactPrompt(params: {
  leadId: string;
  brandId: string;
  lead: ChatLeadSnapshot;
  userMessage: string;
  bookingCtxApplied: ReturnType<typeof applyMessageBookingContext>;
}): Promise<ChatMessageDto[] | null> {
  const { leadId, brandId, lead, userMessage, bookingCtxApplied } = params;
  const name = sanitizeGuestName(lead.guestName);
  const phone = normalizePhone(lead.contactNumber);
  if (name && phone) return null;

  const inBookingFlow =
    lead.status === "BOOKING_STARTED" ||
    Boolean(lead.bookingDate) ||
    Boolean(lead.selectedEventId) ||
    Object.keys(bookingCtxApplied).length > 0;

  if (!inBookingFlow) return null;
  if (guestLooksLikeFactualQuestion(userMessage)) return null;

  const shouldPrompt =
    Object.keys(bookingCtxApplied).length > 0 ||
    guestIsAcknowledgment(userMessage) ||
    guestLooksLikeDatePick(userMessage) ||
    (lead.status === "BOOKING_STARTED" && Boolean(name || phone));

  if (!shouldPrompt) return null;

  if (lead.status !== "BOOKING_STARTED") {
    await updateLeadFields(leadId, { status: "BOOKING_STARTED" });
  }

  const fresh = (await getLeadSnapshot(leadId)) ?? lead;
  const resolvedName = sanitizeGuestName(fresh.guestName);

  if (resolvedName && !normalizePhone(fresh.contactNumber)) {
    return [
      await appendMessage(leadId, "ASSISTANT", askPhoneCopy(brandId, resolvedName, fresh)),
    ];
  }

  return [
    await appendMessage(
      leadId,
      "ASSISTANT",
      askNameAndPhoneCopy(brandId, fresh.selectedEventName)
    ),
  ];
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
    return [await appendMessage(leadId, "ASSISTANT", askNameAndPhoneCopy(brandId, eventName))];
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
    return [await appendMessage(leadId, "ASSISTANT", askNameAndPhoneCopy(brandId, title))];
  }

  const name = sanitizeGuestName(snapshot.guestName);

  if (snapshot.contactNumber && name) {
    return [await appendBookingLinkMessage(leadId, brandId, knowledge.venueName, snapshot)];
  }

  if (name && !snapshot.contactNumber) {
    return [await appendMessage(leadId, "ASSISTANT", askPhoneCopy(brandId, name, snapshot))];
  }

  return [await appendMessage(leadId, "ASSISTANT", askNameAndPhoneCopy(brandId, snapshot.selectedEventName))];
}

/** Text message that looks like a book request — same flow as book_table button. */
export async function tryInstantBookIntentReply(params: {
  leadId: string;
  brandId: string;
  knowledge: VenueChatKnowledge;
  lead: ChatLeadSnapshot;
  userMessage?: string;
}): Promise<ChatMessageDto[] | null> {
  const text = params.userMessage ?? "";
  const ctx = text ? applyMessageBookingContext(text) : {};

  if (Object.keys(ctx).length > 0) {
    await updateLeadFields(params.leadId, ctx);
  }

  const lead = (await getLeadSnapshot(params.leadId)) ?? params.lead;

  // Date/plan change → let AI reply + refreshed booking link
  if (ctx.bookingDate) return null;

  const name = sanitizeGuestName(lead.guestName);
  if (lead.contactNumber && name) {
    return [await appendBookingLinkMessage(params.leadId, params.brandId, params.knowledge.venueName, lead)];
  }

  await updateLeadFields(params.leadId, { status: "BOOKING_STARTED" });
  const telugu = text ? guestWritesTelugu(text) : false;
  if (telugu) {
    return [await appendMessage(params.leadId, "ASSISTANT", bookContactAskCopy("", params.brandId, true))];
  }
  return handleInstantAction({ ...params, action: "book_table", lead });
}
