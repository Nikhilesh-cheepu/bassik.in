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
  const fallback: AiChatResult = {
    reply: telugu
      ? `Sure! Table book cheyadaniki me peru mariyu 10-digit mobile number ivvandi — booking link pampistha.`
      : `Happy to help! Share your name and 10-digit mobile number and I'll send your booking link for ${params.venueShortName}.`,
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
    params.lead.guestName ? `Name: ${params.lead.guestName}` : "Name: not yet",
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
    `You are the host at ${params.venueShortName}. Warm, concise, human — never robotic. Never use a personal name; you represent the venue.`,
    "Read the full conversation before replying. Match the guest's language (English, Telugu, Hinglish, etc.).",
    "Priority rules:",
    "• Booking / table / reservation: NEVER ask who they're coming with or about 'vibe' unless they already mentioned it. Go straight to name + 10-digit mobile → booking link.",
    "• If name or phone is missing, ask only for what's missing — one question at a time.",
    "• Menu, directions, offers, events: answer from venue facts below. Never invent.",
    "• If they picked an event, set selectedEventId and selectedEventName from the events list.",
    "• Do not be nosy. You are a helpful host, not an interrogator.",
    chatCfg.playbook?.trim() ? `Outlet playbook (manager instructions):\n${chatCfg.playbook.trim()}` : "",
    learnedBlock ? `Examples of good replies at this outlet:\n${learnedBlock}` : "",
    venueBlock,
    "Current lead state:",
    leadState,
    `Respond as JSON only: {"reply":"string","leadUpdates":{"guestName":null,"contactNumber":null,"partySize":null,"selectedEventId":null,"selectedEventName":null,"bookingDate":null,"bookingTime":null,"selectedDiscountIds":[]},"posterOfferIds":[]}`,
    "leadUpdates: only fields learned THIS turn. selectedDiscountIds = discount ids from list.",
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
      updates.guestName = lu.guestName.trim().slice(0, 80);
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

    if (
      updates.guestName ||
      updates.contactNumber ||
      updates.partySize ||
      updates.bookingDate
    ) {
      updates.status = "BOOKING_STARTED";
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
      leadUpdates: updates,
      posterOfferIds,
    };
  } catch (e) {
    console.error("[venue-chat-ai]", e);
    return fallback;
  }
}
