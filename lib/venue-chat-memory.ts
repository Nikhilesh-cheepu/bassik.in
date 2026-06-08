import type { ChatLeadSnapshot } from "@/lib/venue-chat-data";
import { formatHumanBookingDate } from "@/lib/venue-chat-booking-policy";
import { sanitizeGuestName } from "@/lib/venue-chat-guest";
import {
  contactComplete,
  mergeContactFromConversation,
  missingContactFields,
  type MergedContact,
} from "@/lib/venue-chat-contact";

export type ConversationMemory = MergedContact & {
  inBookingFlow: boolean;
  missing: ("name" | "phone")[];
  complete: boolean;
};

export function buildConversationMemory(
  lead: ChatLeadSnapshot,
  userMessages: string[],
  currentMessage?: string
): ConversationMemory {
  const merged = mergeContactFromConversation(lead, userMessages, currentMessage);
  const inBookingFlow =
    lead.status === "BOOKING_STARTED" ||
    Boolean(lead.bookingDate) ||
    Boolean(lead.selectedEventId) ||
    Boolean(lead.reservationId);

  return {
    ...merged,
    inBookingFlow,
    missing: missingContactFields(merged),
    complete: contactComplete(merged),
  };
}

/** Authoritative memory block for AI — what we already know vs still need. */
export function buildConversationMemoryPrompt(
  lead: ChatLeadSnapshot,
  history: { role: string; content: string }[],
  userMessage: string
): string {
  const userTexts = history.filter((m) => m.role === "USER").map((m) => m.content);
  const memory = buildConversationMemory(lead, userTexts, userMessage);

  const collected: string[] = [];
  if (memory.guestName) collected.push(`name: ${memory.guestName}`);
  if (memory.contactNumber) collected.push(`mobile: ${memory.contactNumber}`);
  if (lead.bookingDate) collected.push(`date: ${formatHumanBookingDate(lead.bookingDate)}`);
  if (lead.partySize) collected.push(`party: ${lead.partySize}`);
  if (lead.selectedEventName) collected.push(`event: ${lead.selectedEventName}`);

  const recent = userTexts.slice(-6);
  const recentLines =
    recent.length > 0
      ? recent.map((t, i) => `  ${i + 1}. "${t.replace(/\n/g, " ").slice(0, 140)}"`).join("\n")
      : "  (first message)";

  const needLine = memory.complete
    ? "Contact is complete — reply briefly; the app adds the book button. Do NOT ask for name/phone again."
    : memory.missing.length
      ? `Still need: ${memory.missing.join(" and ")} only — do NOT re-ask for fields already listed under "Already know".`
      : "Not collecting contact yet — guest is browsing.";

  return [
    "CONVERSATION MEMORY (authoritative — trust this over your instinct):",
    collected.length ? `Already know: ${collected.join("; ")}` : "Already know: (nothing for booking yet)",
    needLine,
    memory.inBookingFlow ? "Booking flow: active" : "Booking flow: not started",
    "",
    "Recent guest messages (read all before replying):",
    recentLines,
    `Latest: "${userMessage.replace(/\n/g, " ").slice(0, 140)}"`,
    "",
    "Memory rules:",
    "- Name and phone often arrive in separate messages — use the full thread, not only the latest line.",
    "- okay / yes / sure / thanks are agreements, never names.",
    "- Never ask again for anything listed under Already know.",
    "- When you must ask for contact, use only the Name:- / Contact num:- layout.",
  ].join("\n");
}

export function leadHasStoredName(lead: ChatLeadSnapshot): boolean {
  return Boolean(sanitizeGuestName(lead.guestName));
}
