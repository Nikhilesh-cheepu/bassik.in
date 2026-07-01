import { CLUB_ROGUE_GACHIBOWLI_ID, CLUB_ROGUE_BRAND_IDS } from "@/lib/club-rogue";

export const CLUB_ROGUE_THEME = {
  orange: "#F97316",
  orangeLight: "#FB923C",
  orangeDark: "#C2410C",
  bg: "#0c0604",
  bgCard: "rgba(255, 255, 255, 0.06)",
  glow: "rgba(249, 115, 22, 0.35)",
} as const;

/** Rotating hero lines — swap anytime; AI/admin can extend this list later. */
export const CLUB_ROGUE_EMOTIONAL_HOOKS = [
  "Want to dance like crazy? Book a table.",
  "Here to drink and dance? Book a table.",
  "Not drinking, not dancing? Book a table anyway.",
  "Your best Hyderabad night starts with one tap.",
  "The crowd's already moving. Your table's waiting.",
  "Feel it before you walk in. Just book.",
  "Ladies' night. Loud music. Zero excuses — book.",
  "One table between you and a legendary night.",
] as const;

export const CLUB_ROGUE_LANDING: Record<
  (typeof CLUB_ROGUE_BRAND_IDS)[number],
  {
    locality: string;
    /** Short venue label under logo */
    tagline: string;
    /** Extra hooks appended for this location */
    extraHooks: string[];
    /** One quiet line — facts, not a feature list */
    essentials: string;
  }
> = {
  "club-rogue-gachibowli": {
    locality: "Gachibowli",
    tagline: "Tollywood & Bollywood nights",
    extraHooks: ["Tollywood or Bollywood — either way, book a table."],
    essentials: "Ladies' Night · ₹2,000 redeemable cover for gents",
  },
  "club-rogue-kondapur": {
    locality: "Kondapur",
    tagline: "Peak weekend energy",
    extraHooks: ["Kondapur's loudest room is one booking away."],
    essentials: "Ladies' Night · ₹2,000 redeemable cover for gents",
  },
  "club-rogue-jubilee-hills": {
    locality: "Jubilee Hills",
    tagline: "Premium nights, full club vibe",
    extraHooks: ["Jubilee Hills nights don't wait. Book yours."],
    essentials: "Ladies' Night · ₹2,000 redeemable cover for gents",
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
