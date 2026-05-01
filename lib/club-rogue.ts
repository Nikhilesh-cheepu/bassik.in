/** Club Rogue outlets on Bassik — single source for booking rules and scopes. */

export const CLUB_ROGUE_BRAND_IDS = [
  "club-rogue-gachibowli",
  "club-rogue-kondapur",
  "club-rogue-jubilee-hills",
] as const;

export const CLUB_ROGUE_GACHIBOWLI_ID = "club-rogue-gachibowli" as const;

export function isClubRogueBrand(brandId: string): boolean {
  return (CLUB_ROGUE_BRAND_IDS as readonly string[]).includes(brandId);
}

/** Shown during booking — venue policy wording. */
export const CLUB_ROGUE_COVER_CHARGE_SUMMARY =
  "A mandatory ₹2,000 cover charge applies at the venue. It is fully redeemable against food and beverage.";
