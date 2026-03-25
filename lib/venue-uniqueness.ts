import { BRANDS, getPublicBrands, type Brand } from "@/lib/brands";

/**
 * What each venue is “for” — merges Bassik’s vibe chips + one-line brand identity.
 * Edit here when positioning changes; homepage chips in home-intents should stay aligned.
 */
export const VENUE_UNIQUENESS_BY_ID: Record<string, string> = {
  skyhy:
    "Rooftop lounge and city views — lead pick for rooftop nights, outdoor-style seating up top, and live-music energy.",
  c53:
    "World-cuisine, family-friendly dining — lead for proper dining, family outings, outdoor-friendly meals, and live-music-friendly evenings.",
  alehouse:
    "Medieval tavern club: cocktails and late nights — royal / premium night-out feel; strong clubbing pick.",
  "boiler-room":
    "High-energy club and bar with DJ-led nights — core clubbing; strong for Bollywood-style big nights.",
  kiik69:
    "Sports bar with bowling — screens and match nights; also in the mix for Bollywood nights.",
  "club-rogue-gachibowli":
    "Club Rogue Gachibowli — premium club nights; Tollywood crowd; one of the Bollywood lineup venues.",
  "club-rogue-kondapur":
    "Club Rogue Kondapur — same Rogue club formula, Kondapur side — Tollywood / clubbing.",
  "club-rogue-jubilee-hills":
    "Club Rogue Jubilee Hills — same Rogue club formula — Tollywood / clubbing.",
  "sound-of-soul":
    "Club and kitchen with live music leaning — clubbing row; check listings for who’s playing.",
  firefly:
    "Telugu-forward club and social nights — Telugu / Tollywood energy, day-club style parties, and value-menu club nights.",
  "the-hub":
    "Massive live-screen sports hub — sports and screenings when this venue is live on the site.",
  thezenzspot: "Party club vibe — clubbing line-up when visible on site.",
};

/** Homepage vibe chips each venue aligns with (for AI + docs; Hub/Zenz often off public home). */
export const VENUE_HOMEPAGE_VIBES: Record<string, string> = {
  skyhy: "Rooftop · Live music · Outdoor",
  c53: "Dining · Family · Live music · Outdoor",
  alehouse: "Royal vibes · Clubbing",
  "boiler-room": "Clubbing · Bollywood",
  kiik69: "Sports · Bollywood",
  "club-rogue-gachibowli": "Clubbing · Tollywood · Bollywood",
  "club-rogue-kondapur": "Clubbing · Tollywood",
  "club-rogue-jubilee-hills": "Clubbing · Tollywood",
  "sound-of-soul": "Clubbing",
  firefly: "Telugu club · Tollywood · Day club · Clubbing",
  "the-hub": "Sports · Screenings",
  thezenzspot: "Clubbing",
};

export function getVenueUniquenessLine(brandId: string): string | undefined {
  return VENUE_UNIQUENESS_BY_ID[brandId];
}

/** Short blurb for homepage cards (mobile-friendly). */
export function getVenueSpecialtySnippet(b: Brand, maxLen = 100): string {
  const raw = (VENUE_UNIQUENESS_BY_ID[b.id] ?? b.description ?? b.tag ?? "").trim();
  if (!raw) return "";
  if (raw.length <= maxLen) return raw;
  const cut = raw.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 35 ? cut.slice(0, lastSpace) : cut) + "…";
}

/** Compact block for LLM system prompts (public venues only unless `all`). */
export function formatVenueUniquenessForPrompt(opts?: { allBrands?: boolean }): string {
  const list: Brand[] = opts?.allBrands ? BRANDS : getPublicBrands();
  return list
    .map((b) => {
      const u = VENUE_UNIQUENESS_BY_ID[b.id];
      const v = VENUE_HOMEPAGE_VIBES[b.id];
      if (!u && !v) return null;
      const vibes = v ? ` [chips: ${v}]` : "";
      const body = u ?? b.description ?? b.tag ?? "";
      return `- ${b.shortName}: ${body}${vibes}`;
    })
    .filter(Boolean)
    .join("\n");
}
