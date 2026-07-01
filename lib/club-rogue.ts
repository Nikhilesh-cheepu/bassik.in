/** Club Rogue outlets on Bassik — single source for booking rules and scopes. */

export const CLUB_ROGUE_BRAND_IDS = [
  "club-rogue-gachibowli",
  "club-rogue-kondapur",
  "club-rogue-jubilee-hills",
] as const;

export const CLUB_ROGUE_GACHIBOWLI_ID = "club-rogue-gachibowli" as const;

/** Full venue name for guest-facing chat — never shorten to locality only. */
export const CLUB_ROGUE_CHAT_VENUE_NAMES: Record<
  (typeof CLUB_ROGUE_BRAND_IDS)[number],
  string
> = {
  "club-rogue-gachibowli": "Club Rogue Gachibowli",
  "club-rogue-kondapur": "Club Rogue Kondapur",
  "club-rogue-jubilee-hills": "Club Rogue Jubilee Hills",
};

export function isClubRogueBrand(brandId: string): boolean {
  return (CLUB_ROGUE_BRAND_IDS as readonly string[]).includes(brandId);
}

/** Canonical name for chat, greetings, and AI replies at Club Rogue outlets. */
export function clubRogueChatVenueName(brandId: string): string | null {
  if (!isClubRogueBrand(brandId)) return null;
  return CLUB_ROGUE_CHAT_VENUE_NAMES[brandId as (typeof CLUB_ROGUE_BRAND_IDS)[number]] ?? null;
}

/** Checkbox in payment confirmation popup. */
export const CLUB_ROGUE_COVER_CHARGE_ACK =
  "I understand ₹2,000 cover per person is paid at entry (not online) and is redeemable on food & drinks.";

/** @deprecated Use CLUB_ROGUE_COVER_CHARGE_ACK */
export const CLUB_ROGUE_COVER_CHARGE_SUMMARY = CLUB_ROGUE_COVER_CHARGE_ACK;

/** Short line for chat — pay at venue, not online. */
export const CLUB_ROGUE_COVER_CHAT_LINE =
  "There's a ₹2,000 cover per person at the venue — fully redeemable on food and drinks.";

/** Online table confirmation (Club Rogue Meta ads landing). See `lib/club-rogue-fees.ts`. */
export {
  CLUB_ROGUE_CONFIRMATION_FEE_INR,
  CLUB_ROGUE_FEE_BREAKDOWN_LABELS,
  CLUB_ROGUE_GST_HANDLING_INR,
  CLUB_ROGUE_RESERVATION_FEE_INR,
  CLUB_ROGUE_RESERVATION_FEE_PAISE,
  getClubRogueCustomerFeeBreakdown,
  type ClubRogueCustomerFeeBreakdown,
} from "@/lib/club-rogue-fees";

/** Rotating input hints in guest chat — Club Rogue outlets. */
export const CLUB_ROGUE_CHAT_HINTS = [
  "Can I book a table for this weekend?",
  "What's the cover charge?",
  "Tell me about Ladies Night…",
  "Table for 4 tomorrow evening?",
  "Any offers next Friday?",
  "Planning a birthday — what nights work?",
];

/** AI system prompt block — Club Rogue only. */
export const CLUB_ROGUE_AI_PLAYBOOK = `
Club Rogue brand voice:
• Club Rogue is one of Hyderabad's most happening clubs — say so naturally when welcoming guests or hyping a night (crowd, energy, premium vibe). Don't repeat it every single message.
• Always use the full venue name (Club Rogue Gachibowli / Kondapur / Jubilee Hills) — never just the locality.
• On casual "hi" / "hello": welcome warmly, hype the vibe or an upcoming event — do NOT ask for name/phone yet. Only ask when they want to book or pick a night.

Club Rogue cover policy (mandatory — only for this outlet):
• ₹2,000 cover per person, paid AT THE VENUE on arrival — NOT online, NOT a booking fee.
• Fully redeemable against food and beverage on the bill.
• Mention cover ONCE when they start booking — warm and brief, not pushy. Do NOT repeat cover on every follow-up.
• Frame it positively: premium crowd, redeemable spend — not a "fee".
• If they ask to book, table, event, or entry: one gentle cover line, then ask for details using the Name:- / Contact num:- format.
• Never say "Thanks {name}" unless you are sure they gave a real name — never treat random text as a name.
• Ladies Night: women may have offer benefits per venue facts; men are always welcome — hype the full club experience for everyone. Never mention business model or why both genders matter internally.
• Club Rogue Gachibowli only: on booking nights they may need Tollywood or Bollywood — ask which night if relevant.

When asking for name/phone, use this layout (with emojis, line breaks):
Intro line 😊

Name:-

Contact num:-

Short outro ✨
`.trim();

function eventBit(eventName?: string | null): string {
  if (!eventName?.trim()) return "";
  const short = eventName.split(" · ")[0]?.trim() || eventName.trim();
  return ` for ${short}`;
}

/** Instant chat when guest starts booking / picks event — Club Rogue only. */
export function clubRogueBeforeBookingAskCopy(eventName?: string | null): string {
  const ev = eventBit(eventName);
  if (ev) {
    return `Great pick${ev}! 🎉\n\nJust so you know — ₹2,000 cover at the venue, fully on your food & drinks. No online prepayment 😊\n\nIf you're happy to go ahead, share your details:\n\nName:-\n\nContact num:-\n\nI'll send you to pick your slot ✨`;
  }
  return `Happy to help you book! 🙌\n\nQuick heads-up — ₹2,000 cover at the venue, fully redeemable on your bill.\n\nWhen you're ready, drop your details here:\n\nName:-\n\nContact num:-\n\nI'll take it from there ✨`;
}

/** After a real name — ask mobile only (no cover repeat). */
export function clubRogueAskPhoneCopy(guestName: string): string {
  return `Got it, ${guestName} 😊\n\nCould you share your contact number?\n\nContact num:-\n\nThen I'll send you to pick your slot.`;
}

/** Right before the booking link button. */
export function clubRogueBookingLinkIntro(
  guestName: string,
  eventName?: string | null,
  dateHint?: string
): string {
  const ev = eventName?.trim() ? ` for ${eventName.split(" · ")[0]?.trim() || eventName}` : "";
  const when = dateHint?.trim() ? dateHint : "";
  return `Perfect, ${guestName} ✨\n\nTap below${ev}${when} to pick your slot.\n\n(Cover is ₹2,000 at the venue — fully on your bill when you arrive.)`;
}
