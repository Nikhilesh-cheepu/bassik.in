import { CLUB_ROGUE_GACHIBOWLI_ID, CLUB_ROGUE_BRAND_IDS } from "@/lib/club-rogue";

export const CLUB_ROGUE_THEME = {
  orange: "#F97316",
  orangeLight: "#FB923C",
  orangeDark: "#C2410C",
  bg: "#0f0a09",
  bgMid: "#16100e",
  surface: "rgba(255, 255, 255, 0.05)",
  surfaceRaised: "rgba(255, 255, 255, 0.08)",
  border: "rgba(255, 255, 255, 0.1)",
  borderSubtle: "rgba(255, 255, 255, 0.06)",
  text: "#FAFAF9",
  textMuted: "rgba(255, 255, 255, 0.5)",
  textDim: "rgba(255, 255, 255, 0.35)",
  glow: "rgba(249, 115, 22, 0.22)",
} as const;

/**
 * Rotating hero lines — one mood per slide.
 * Breakup · date night · single · ladies · squad · weekend · dance
 */
export const CLUB_ROGUE_EMOTIONAL_HOOKS = [
  "Fresh breakup? The bass hits harder than your ex. Book a table.",
  "Date night tonight? Lock the table before the butterflies panic.",
  "Single? Perfect. Your table does not need a plus-one.",
  "Ladies — free drinks on us. Book your table and walk in.",
  "New date, new outfit, new plans? Book the table first.",
  "Squad night out? Do not show up without a table.",
  "Flying solo? The dance floor still loves you. Book ahead.",
  "Saturday night and no plan? Fix that — book a table.",
  "Came to drink, dance, and forget Monday? Book your table.",
  "Birthday, anniversary, or no reason at all — book your table and celebrate.",
  "The night is young. Your table should be booked already.",
  "One tap. One table. One story for tomorrow morning.",
] as const;

export const CLUB_ROGUE_LANDING: Record<
  (typeof CLUB_ROGUE_BRAND_IDS)[number],
  {
    locality: string;
    extraHooks: string[];
  }
> = {
  "club-rogue-gachibowli": {
    locality: "Gachibowli",
    extraHooks: [
      "Tollywood or Bollywood tonight? Either way — book your table.",
      "Gachibowli crowd is already getting ready. Book before they do.",
    ],
  },
  "club-rogue-kondapur": {
    locality: "Kondapur",
    extraHooks: [
      "Kondapur weekends do not wait. Book your table now.",
      "Peak energy, packed floor — table booked means you are in.",
    ],
  },
  "club-rogue-jubilee-hills": {
    locality: "Jubilee Hills",
    extraHooks: [
      "Jubilee Hills nights hit different — book like you mean it.",
      "Dress up, show up, table ready. That is the move.",
    ],
  },
};

export function getClubRogueLanding(brandId: string) {
  if (brandId in CLUB_ROGUE_LANDING) {
    return CLUB_ROGUE_LANDING[brandId as keyof typeof CLUB_ROGUE_LANDING];
  }
  return CLUB_ROGUE_LANDING[CLUB_ROGUE_GACHIBOWLI_ID];
}

export function getClubRogueHooks(brandId: string): string[] {
  const landing = getClubRogueLanding(brandId);
  return [...CLUB_ROGUE_EMOTIONAL_HOOKS, ...landing.extraHooks];
}
