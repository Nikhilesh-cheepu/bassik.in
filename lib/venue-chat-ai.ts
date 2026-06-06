import OpenAI from "openai";
import type { ChatLeadSnapshot, WeekOffer } from "@/lib/venue-chat-data";
import { type LeadFieldUpdates, type ChatMessageDto } from "@/lib/venue-chat-data";
import { getDiscountsForBrand } from "@/lib/reservation-discounts";
import {
  buildVenueKnowledgePrompt,
  getVenueChatKnowledge,
} from "@/lib/venue-chat-knowledge";
import { formatLearnedForPrompt, getVenueChatConfig } from "@/lib/venue-chat-config";
import { guestWritesTelugu } from "@/lib/venue-chat-actions";
import { sanitizeGuestName } from "@/lib/venue-chat-guest";
import { CLUB_ROGUE_AI_PLAYBOOK, isClubRogueBrand } from "@/lib/club-rogue";
import {
  CHAT_BOOKING_AI_RULES,
  CHAT_CONCIERGE_PLAYBOOK,
  buildChatBookingDateContext,
  sanitizeChatLeadBookingFields,
} from "@/lib/venue-chat-booking-policy";

export type AiChatResult = {
  reply: string;
  leadUpdates: LeadFieldUpdates;
  posterOfferIds: string[];
};

type HistoryRow = { role: "user" | "assistant"; content: string };

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = raw.replace(/\D/g, "").slice(-10);
  return d.length === 10 ? d : null;
}

export async function runVenueChatTurn(params: {
  brandId: string;
  venueShortName: string;
  lead: ChatLeadSnapshot;
  offers: WeekOffer[];
  history: ChatMessageDto[];
  userMessage: string;
}): Promise<AiChatResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const telugu = guestWritesTelugu(params.userMessage);
  const guestName = sanitizeGuestName(params.lead.guestName);
  const isClubRogue = isClubRogueBrand(params.brandId);
  const fallback: AiChatResult = {
    reply: telugu
      ? `Chala bagundi! ${isClubRogue ? "Venue daggara ₹2,000 cover undi — bill meeda adjust avutundi. " : ""}Me peru cheppandi — table book chesi help chestha.`
      : guestName
        ? isClubRogue
          ? `Thanks, ${guestName}! Cover is ₹2k at the venue — fully on your bill. Share your mobile whenever you're ready and I'll send you to our booking page.`
          : `Thanks, ${guestName}! Whenever you're ready, just share your mobile number — I'll send you to pick a date & time.`
        : isClubRogue
          ? `Hey! Welcome to ${params.venueShortName} — one of Hyderabad's most happening clubs. Big nights all week — tell me when you're thinking of coming or which event caught your eye.`
          : `Hey! Welcome — whether it's tonight, this weekend, or a date you're planning ahead, tell me what you're thinking and I'll help you pick the right night.`,
    leadUpdates: {},
    posterOfferIds: [],
  };

  if (!apiKey) return fallback;

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const knowledge = await getVenueChatKnowledge(params.brandId);
  const chatCfg = await getVenueChatConfig(params.brandId);
  const venueBlock = buildVenueKnowledgePrompt(knowledge, params.offers);
  const learnedBlock = formatLearnedForPrompt(chatCfg.learnedExamples);

  const leadState = [
    `Display label: ${params.lead.displayLabel}`,
    guestName ? `Name: ${guestName}` : "Name: not yet",
    params.lead.contactNumber ? `Phone: ${params.lead.contactNumber}` : "Phone: not yet",
    params.lead.partySize ? `Party size: ${params.lead.partySize}` : "Party size: not yet",
    params.lead.bookingDate ? `Date: ${params.lead.bookingDate}` : "Date: not yet",
    params.lead.bookingTime ? `Time: ${params.lead.bookingTime}` : "Time: not yet",
    params.lead.selectedEventName
      ? `Event: ${params.lead.selectedEventName}`
      : "Event: not chosen",
    params.lead.selectedDiscounts.length
      ? `Discounts: ${params.lead.selectedDiscounts.join(", ")}`
      : "Discounts: none chosen",
    params.lead.reservationId ? `Booking ref: ${params.lead.reservationId}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const historyForModel: HistoryRow[] = params.history
    .filter((m) => m.role === "USER" || m.role === "ASSISTANT" || m.role === "MANAGER")
    .slice(-30)
    .map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.imageUrl ? `${m.content} [poster attached]` : m.content,
    }));

  const system = [
    `You are the PR / guest relations host at ${params.venueShortName}. Warm, polished, never pushy — like a good hotel concierge, not a call centre script.`,
    CHAT_CONCIERGE_PLAYBOOK,
    isClubRogue
      ? `Venue naming: always say "${params.venueShortName}" in full — never shorten to just the area (e.g. never say only "Gachibowli").`
      : "",
    buildChatBookingDateContext(),
    "Read the full conversation before replying. Match the guest's language (English, Telugu, Hinglish, etc.).",
    "Tone & flow:",
    "• Sound human and pleasant — make the night sound exciting. Never say 'share your 10-digit mobile' or 'I will send you the link' — that feels robotic.",
    "• Engagement first: on hi/hello or vague openers, welcome them and mention vibe, events, or offers — do NOT ask for name/phone unless they want to book.",
    "• Booking: today, tomorrow, any future date — same flow. Ask name + mobile in one warm line when they want a table. After both are captured, reply briefly — the app adds the book button; do NOT paste URLs. Never say they are confirmed or booked.",
    "• If they share name/phone voluntarily, capture it — never nag if they're just browsing.",
    CHAT_BOOKING_AI_RULES,
    "• Once you know their real name, use it in every reply.",
    "• NEVER set guestName from phrases like 'I'm interested in…' or event titles — those are not names.",
    "• If they picked or mentioned an event, set selectedEventId and selectedEventName. Use a short event label in chat (e.g. 'DJ SHWETH'), not the full poster line.",
    "• Menu, directions, offers: answer from venue facts. Never invent.",
    "• One question per message. No nosy questions about who they're with.",
    isClubRogue ? CLUB_ROGUE_AI_PLAYBOOK : "",
    chatCfg.playbook?.trim() ? `Outlet playbook (manager instructions):\n${chatCfg.playbook.trim()}` : "",
    learnedBlock ? `Examples of good replies at this outlet:\n${learnedBlock}` : "",
    venueBlock,
    "Current lead state:",
    leadState,
    `Respond as JSON only: {"reply":"string","leadUpdates":{"guestName":null,"contactNumber":null,"partySize":null,"selectedEventId":null,"selectedEventName":null,"bookingDate":null,"bookingTime":null,"selectedDiscountIds":[]},"posterOfferIds":[]}`,
    "leadUpdates: only fields learned THIS turn. bookingDate/bookingTime are prefill hints for the booking form only — omit if date/time is in the past. selectedDiscountIds = discount ids from list.",
    "posterOfferIds: offer ids if guest asks to see a poster (max 2).",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.75,
      max_tokens: 650,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        ...historyForModel,
        { role: "user", content: params.userMessage },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    const parsed = JSON.parse(raw) as {
      reply?: string;
      leadUpdates?: Record<string, unknown>;
      posterOfferIds?: string[];
    };

    const updates: LeadFieldUpdates = {};
    const lu = parsed.leadUpdates ?? {};
    if (typeof lu.guestName === "string" && lu.guestName.trim()) {
      const name = sanitizeGuestName(lu.guestName.trim().slice(0, 80));
      if (name) updates.guestName = name;
    }
    const phone = normalizePhone(
      typeof lu.contactNumber === "string" ? lu.contactNumber : null
    );
    if (phone) updates.contactNumber = phone;
    if (typeof lu.partySize === "number" && lu.partySize > 0 && lu.partySize <= 30) {
      updates.partySize = Math.round(lu.partySize);
    }
    if (typeof lu.selectedEventId === "string") {
      updates.selectedEventId = lu.selectedEventId.slice(0, 64);
    }
    if (typeof lu.selectedEventName === "string") {
      updates.selectedEventName = lu.selectedEventName.trim().slice(0, 120);
    }
    if (typeof lu.bookingDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(lu.bookingDate)) {
      updates.bookingDate = lu.bookingDate;
    }
    if (typeof lu.bookingTime === "string" && /^\d{2}:\d{2}$/.test(lu.bookingTime)) {
      updates.bookingTime = lu.bookingTime;
    }
    if (Array.isArray(lu.selectedDiscountIds)) {
      const valid = getDiscountsForBrand(params.brandId).map((d) => d.id);
      updates.selectedDiscounts = lu.selectedDiscountIds
        .filter((x): x is string => typeof x === "string" && valid.includes(x))
        .slice(0, 4);
    }

    const sanitized = sanitizeChatLeadBookingFields(updates);

    if (sanitized.guestName || sanitized.contactNumber) {
      sanitized.status = "BOOKING_STARTED";
    }

    const posterOfferIds = Array.isArray(parsed.posterOfferIds)
      ? parsed.posterOfferIds
          .filter((x): x is string => typeof x === "string")
          .filter((id) => params.offers.some((o) => o.id === id))
          .slice(0, 2)
      : [];

    return {
      reply:
        typeof parsed.reply === "string" && parsed.reply.trim()
          ? parsed.reply.trim().slice(0, 1200)
          : fallback.reply,
      leadUpdates: sanitized,
      posterOfferIds,
    };
  } catch (e) {
    console.error("[venue-chat-ai]", e);
    return fallback;
  }
}
