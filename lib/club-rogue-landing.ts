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

/** Rotating hero lines — clear, professional, booking-focused. */
export const CLUB_ROGUE_EMOTIONAL_HOOKS = [
  "Reserve your table. Walk in ready for the night.",
  "Book ahead. Skip the wait at the door.",
  "Weekend tables fill fast — secure yours now.",
  "Planning a night out? Confirm your table in seconds.",
  "Come with friends or on your own. Just book ahead.",
  "One confirmed table. One great night out.",
  "The night is already moving. Reserve your spot.",
  "Hyderabad club nights start with a booked table.",
  "Lock your table before you head out.",
  "Your table is one step away.",
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
      "Tollywood and Bollywood nights — reserve your table.",
      "Gachibowli weekends are busy. Book your table early.",
    ],
  },
  "club-rogue-kondapur": {
    locality: "Kondapur",
    extraHooks: [
      "Kondapur nights move fast — confirm your table ahead.",
      "Peak weekend energy starts with a reserved table.",
    ],
  },
  "club-rogue-jubilee-hills": {
    locality: "Jubilee Hills",
    extraHooks: [
      "Premium club nights — reserve your table in advance.",
      "Jubilee Hills fills up early. Book before you leave home.",
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
