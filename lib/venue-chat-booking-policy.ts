import { addLocalDays, toLocalDateString, localYmdTimeMs } from "@/lib/local-date";
import type { ChatLeadSnapshot } from "@/lib/venue-chat-data";
import type { LeadFieldUpdates } from "@/lib/venue-chat-data";
import type { BookingPathPrefill } from "@/lib/venue-chat-paths";

/** How the host should sound — not a form bot. */
export const CHAT_CONCIERGE_PLAYBOOK = `
You are a sharp, warm venue host — like someone who actually works the floor, not a FAQ widget.
• Read the whole thread. Mirror their energy: excited guest → hype the night; practical guest → clear and helpful.
• Vary your wording — never repeat the same sentence twice in one conversation.
• Answer the question they asked FIRST, then one gentle next step if relevant.
• "Tonight", "today", "this Friday", "next month" — treat all as normal; you're helping plan any future visit, not only tonight.
• If they're vague ("planning something"), help them choose a night from events/offers before asking for contact details.
• If they're ready ("book for 6 tomorrow"), acknowledge date + party naturally, then name + mobile when booking is the goal.
• Never sound like a call centre: avoid "10-digit mobile", "I will send you the link", "please provide", "kindly share".
• Telugu / Hinglish / mixed — reply in the same mix when they use it.
`.trim();

/** AI system prompt — chat never confirms reservations; booking form does. */
export const CHAT_BOOKING_AI_RULES = `
Booking rules (critical — chat is NOT the booking engine):
• NEVER say confirmed, booked, locked in, reserved, or you're in — only the booking page confirms after a valid future slot is chosen.
• NEVER store past dates or past times (including a time earlier today). Tell them live slots are on the booking page.
• When they want a table/event/entry: capture name + mobile; the app adds the book button — do NOT paste URLs in reply text.
• bookingDate / bookingTime / partySize in leadUpdates = prefill hints only (today, tomorrow, any future date). Form shows real availability.
• If they give date/time/party but not name/phone yet → ask name + mobile in one warm line, then they get the booking link.
• Menu, cover, dress code, directions, events → answer from venue facts. Confirmation only on the official book flow.

Relative dates (use calendar below — always output YYYY-MM-DD in leadUpdates):
• today / tonight / this evening → today's date (if still valid for future slots)
• tomorrow / day after tomorrow → add days
• this weekend → nearest Fri–Sun they mean; if ambiguous, ask which day once
• next Friday / this Saturday / 15th / March 8 → resolve to correct YYYY-MM-DD if today or future
• in 2 weeks / next month → resolve or ask one clarifying question

When they mention a time (8pm, 21:00, dinner, late night):
• Store bookingTime as HH:mm (24h) only if date+time is still in the future; else omit time and say they'll pick on the booking page.

Party size: table for 4, party of 6, 8 of us, we are 5 → partySize in leadUpdates.

Booking intent scenarios (handle naturally — not scripts):
• Today/tonight: "table tonight", "coming in 2 hours", "still have space today?" → help + prefill today if future slots possible; name/phone → booking link.
• Future: tomorrow, weekend, birthday next week, office party on 12th, anniversary Saturday → acknowledge the plan, capture details, prefill date if clear.
• Event-led: Ladies Night, DJ night, Bollywood → set selectedEventId/Name; still booking page for slot.
• Partial info: only date, only time, only headcount → remember in leadUpdates, ask what's missing for the link (usually name + phone).
• Change of plans: "actually Sunday not Saturday" → update leadUpdates; clear selectedEventId/Name if they pick a date instead of an event; never claim old slot is held.
• CRITICAL — respond to the LAST message: if they say "next Wednesday", your reply must mention Wednesday (or the resolved date) — never repeat an old event name (e.g. Soulmates) unless they just asked about that event again.
• Date-led booking (next Sunday, this Friday, 12th): set bookingDate, set selectedEventId and selectedEventName to null — table booking, not event poster flow.
• Never set guestName from okay, yes, sure, thanks, or other affirmations.
• Status: "am I booked?", "did my booking go through?" → if no booking ref in lead state, they still need the booking page; be kind, not robotic.
• Modify/cancel/no-show → can't change in chat; venue phone/WhatsApp from facts if available.
• Walk-in: "can we just walk in?" → policy from facts; offer booking link if they want a guaranteed table.
• Running late / hold table → can't hold in chat; suggest calling venue or completing booking page.
• Compare nights: "Friday or Saturday?" → advise from events/offers; don't force booking until they choose.
• Budget/cover/offers: explain; final price/offer on form when slot is picked.
• Group types: birthday, bachelor, corporate, couples, ladies group — tailor tone, same booking flow.
• Language: Telugu table book cheyyandi, Hinglish kal book karna hai — same flow, their language.

Non-booking (do NOT push booking link):
• Opening hours, location, parking, menu, vibe, photos, "what's happening" → answer only.
• "What time does it start tonight?" without wanting a table → event info only.

After name + mobile are captured and they wanted a booking → short warm reply; app attaches book button. Do not say confirmed.
`.trim();

/** Inject into AI system prompt so relative dates resolve correctly. */
export function buildChatBookingDateContext(now = new Date()): string {
  const today = toLocalDateString(now);
  const tomorrow = toLocalDateString(addLocalDays(now, 1));
  const dayName = now.toLocaleDateString("en-IN", { weekday: "long" });
  const timeNow = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const lines: string[] = [];
  for (let i = 0; i < 15; i++) {
    const d = addLocalDays(now, i);
    const ymd = toLocalDateString(d);
    const wd = d.toLocaleDateString("en-IN", { weekday: "long" });
    const tag = i === 0 ? "today" : i === 1 ? "tomorrow" : "";
    lines.push(`  ${ymd} — ${wd}${tag ? ` (${tag})` : ""}`);
  }

  return [
    "Venue local calendar (Asia/Kolkata — use for resolving today/tonight/tomorrow/day names):",
    `Now: ${dayName} ${today}, ${timeNow}.`,
    `Tomorrow: ${tomorrow}.`,
    "Next 15 days:",
    ...lines,
    "Prefill bookingDate only for today or a future day in this window. bookingTime only if that datetime is still in the future.",
  ].join("\n");
}

export function isFutureBookingDate(dateYmd: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return false;
  return dateYmd >= toLocalDateString(new Date());
}

export function isFutureBookingSlot(dateYmd: string, timeHhmm: string): boolean {
  if (!isFutureBookingDate(dateYmd) || !/^\d{2}:\d{2}$/.test(timeHhmm)) return false;
  const ms = localYmdTimeMs(dateYmd, timeHhmm);
  return Number.isFinite(ms) && ms > Date.now();
}

/** Strip invalid / past booking fields from AI or chat updates. */
export function sanitizeChatLeadBookingFields(updates: LeadFieldUpdates): LeadFieldUpdates {
  const out: LeadFieldUpdates = { ...updates };

  if (out.bookingDate !== undefined && out.bookingDate !== null) {
    if (!isFutureBookingDate(out.bookingDate)) {
      delete out.bookingDate;
    }
  }

  if (out.bookingTime !== undefined && out.bookingTime !== null) {
    const date = out.bookingDate;
    if (!date || !isFutureBookingSlot(date, out.bookingTime)) {
      delete out.bookingTime;
    }
  }

  if (typeof out.partySize === "number") {
    out.partySize = Math.min(30, Math.max(1, Math.round(out.partySize)));
  }

  return out;
}

const WEEKDAY_DOW: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  wedneseday: 3,
  wednsesday: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

function normalizeWeekdayText(text: string): string {
  return text
    .replace(/wednsesday/gi, "wednesday")
    .replace(/wedneseday/gi, "wednesday")
    .replace(/thursady/gi, "thursday");
}

/** Resolve "next Wednesday", "this Sunday", "on Friday" → YYYY-MM-DD. */
export function parseWeekdayBookingDate(text: string, now = new Date()): string | null {
  const normalized = normalizeWeekdayText(text);
  const m = normalized.match(
    /\b(?:(next|this|coming)\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\b/i
  );
  if (!m) return null;

  const modifier = (m[1] || "").toLowerCase();
  const dayKey = m[2].toLowerCase();
  const targetDow = WEEKDAY_DOW[dayKey];
  if (targetDow === undefined) return null;

  const currentDow = now.getDay();
  let daysAhead = targetDow - currentDow;

  if (modifier === "next") {
    if (daysAhead <= 0) daysAhead += 7;
    if (daysAhead === 0) daysAhead = 7;
  } else if (modifier === "this" || modifier === "coming") {
    if (daysAhead < 0) daysAhead += 7;
  } else if (/\b(?:on|for)\s+(?:next|this)?/i.test(normalized)) {
    if (daysAhead <= 0) daysAhead += 7;
  } else {
    if (daysAhead <= 0) daysAhead += 7;
  }

  const ymd = toLocalDateString(addLocalDays(now, daysAhead));
  return isFutureBookingDate(ymd) ? ymd : null;
}

export function isDateLedBookingMessage(text: string): boolean {
  const t = normalizeWeekdayText(text);
  return (
    parseWeekdayBookingDate(t) !== null ||
    /\b(tomorrow|tonight|today|weekend|day after tomorrow|20\d{2}-\d{2}-\d{2})\b/i.test(t) ||
    /\bbook(ing)?\s+(on|for)\s+/i.test(t)
  );
}

export function formatHumanBookingDate(dateYmd: string): string {
  const [y, mo, d] = dateYmd.split("-").map(Number);
  if (!y || !mo || !d) return dateYmd;
  const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
  return dt.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
}

/** Parse simple party/date hints from guest text (instant path + AI backup). */
export function tryExtractBookingHints(text: string, now = new Date()): LeadFieldUpdates {
  const hints: LeadFieldUpdates = {};
  const today = toLocalDateString(now);
  const normalized = normalizeWeekdayText(text);

  const partyMatch =
    normalized.match(/\b(?:party\s+of|table\s+for|for)\s+(\d{1,2})\b/i) ??
    normalized.match(/\b(\d{1,2})\s+(?:people|pax|guests?|members?|of\s+us|log|janalu)\b/i);
  if (partyMatch) {
    const n = parseInt(partyMatch[1], 10);
    if (n >= 1 && n <= 30) hints.partySize = n;
  }

  const weekday = parseWeekdayBookingDate(normalized, now);
  if (weekday) {
    hints.bookingDate = weekday;
  } else if (/\b(tonight|today|this evening|ee\s*roju|ikrata|aaj)\b/i.test(normalized)) {
    hints.bookingDate = today;
  } else if (/\b(tomorrow|repu|kal|naa\s*kalu)\b/i.test(normalized)) {
    hints.bookingDate = toLocalDateString(addLocalDays(now, 1));
  } else if (/\bday after tomorrow\b/i.test(normalized)) {
    hints.bookingDate = toLocalDateString(addLocalDays(now, 2));
  } else if (/\bthis weekend\b/i.test(normalized)) {
    const dow = now.getDay();
    const daysUntilSat = dow === 6 ? 0 : dow === 0 ? 6 : 6 - dow;
    hints.bookingDate = toLocalDateString(addLocalDays(now, daysUntilSat));
  }

  const iso = normalized.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso?.[1] && isFutureBookingDate(iso[1])) {
    hints.bookingDate = iso[1];
  }

  const time12 = normalized.match(/\b(\d{1,2})(?::(\d{2}))?\s*(pm|am)\b/i);
  if (time12) {
    let h = parseInt(time12[1], 10);
    const m = time12[2] ? parseInt(time12[2], 10) : 0;
    const pm = time12[3].toLowerCase() === "pm";
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      hints.bookingTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }

  const time24 = normalized.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (time24 && !hints.bookingTime) {
    hints.bookingTime = `${String(parseInt(time24[1], 10)).padStart(2, "0")}:${time24[2]}`;
  }

  if (hints.bookingTime && !hints.bookingDate) {
    hints.bookingDate = today;
  }

  return sanitizeChatLeadBookingFields(hints);
}

/** Apply date/party hints; clear stale event when guest books by date. */
export function applyMessageBookingContext(text: string, now = new Date()): LeadFieldUpdates {
  const hints = tryExtractBookingHints(text, now);
  if (hints.bookingDate && isDateLedBookingMessage(text)) {
    hints.selectedEventId = null;
    hints.selectedEventName = null;
  }
  return hints;
}

export function buildBookingPrefillFromLead(lead: ChatLeadSnapshot): BookingPathPrefill {
  const prefill: BookingPathPrefill = {
    name: lead.guestName,
    phone: lead.contactNumber,
    party: lead.partySize,
  };

  if (lead.bookingDate && isFutureBookingDate(lead.bookingDate)) {
    prefill.date = lead.bookingDate;
    if (lead.bookingTime && isFutureBookingSlot(lead.bookingDate, lead.bookingTime)) {
      prefill.time = lead.bookingTime;
    }
    return prefill;
  }

  if (lead.selectedEventId) {
    prefill.eventId = lead.selectedEventId;
  }

  return prefill;
}
