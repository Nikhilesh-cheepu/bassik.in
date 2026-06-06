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

/** Shown during booking forms — venue policy wording. */
export const CLUB_ROGUE_COVER_CHARGE_SUMMARY =
  "A mandatory ₹2,000 cover charge applies at the venue. It is fully redeemable against food and beverage.";

/** Short line for chat — pay at venue, not online. */
export const CLUB_ROGUE_COVER_CHAT_LINE =
  "There's a ₹2,000 cover per person at the venue — fully redeemable on food and drinks.";

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
• Mention it clearly and warmly BEFORE you ask for name/phone or push booking — never hide it.
• Frame it positively: premium crowd, Hyderabad's happening club nights, redeemable spend — not a "fee".
• If they ask to book, table, event, or entry: cover first, then "if you're happy with that" → name + mobile.
• If they hesitate: reassure it's redeemable on the bill; no online prepayment required.
• Never say "mandatory fee" or "extra charge" — say "cover at the venue" or "redeemable cover".
• Club Rogue Gachibowli only: on booking nights they may need Tollywood or Bollywood — ask which night if relevant.

Example tones (vary naturally — do not copy verbatim every time):
• "Welcome to Club Rogue Kondapur — one of Hyderabad's most happening clubs. Planning tonight, this weekend, or a date later?"
• "Quick heads-up — ₹2k cover at the door, fully redeemable on your tab. If you're good with that, what's your name and number? I'll send you to pick a slot."
• "Love the plan for Saturday! Cover is ₹2,000 at the venue — goes straight onto food & drinks. Happy to proceed? Share your name and mobile."
• "Whenever you're ready — ₹2,000 redeemable cover at the venue. Name and number and I'll get you to our booking page for any day that works."
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
    return `Great pick${ev}! ${CLUB_ROGUE_COVER_CHAT_LINE} If you're happy with that, share your name and mobile — I'll take it from here.`;
  }
  return `${CLUB_ROGUE_COVER_CHAT_LINE} If you're ready to go ahead, share your name and mobile — I'll send you to our booking page.`;
}

/** After name, before phone — optional shorter nudge. */
export function clubRogueAskPhoneCopy(guestName: string): string {
  return `Thanks, ${guestName}! Whenever you're ready, share your mobile — cover is ₹2k at the venue, fully on your bill. Then I'll send you to pick a slot.`;
}

/** Right before the booking link button. */
export function clubRogueBookingLinkIntro(
  guestName: string,
  eventName?: string | null,
  dateHint?: string
): string {
  const ev = eventName?.trim() ? ` for ${eventName.split(" · ")[0]?.trim() || eventName}` : "";
  const when = dateHint?.trim() ? dateHint : "";
  return `Thanks, ${guestName} — tap below${ev}${when} to pick your slot. ₹2,000 redeemable cover at the venue when you arrive.`;
}
