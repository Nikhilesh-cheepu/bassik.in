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

/** Rotating hero lines — emotional, booking-focused. */
export const CLUB_ROGUE_EMOTIONAL_HOOKS = [
  "Bring your girl. Or don't. Either way, book a table.",
  "No plus-one? Your table's still waiting.",
  "Date night, boys' night, solo night — just book.",
  "She said yes? Lock the table before someone else does.",
  "Coming solo? The dance floor doesn't judge.",
  "Want to dance like crazy? Book a table.",
  "The crowd's already moving. Your table's waiting.",
  "One tap between you and a legendary night.",
  "Here to drink and dance? Book a table.",
  "Feel it before you walk in. Just book.",
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
    extraHooks: ["Tollywood or Bollywood — pick your vibe, book your table."],
  },
  "club-rogue-kondapur": {
    locality: "Kondapur",
    extraHooks: ["Kondapur nights hit different. Book before it's gone."],
  },
  "club-rogue-jubilee-hills": {
    locality: "Jubilee Hills",
    extraHooks: ["Jubilee Hills energy. One table away."],
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
