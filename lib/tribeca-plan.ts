/** Short marketing roadmap for Tribeca Cafe — scannable, campaign-led. */

export type PlanIcon =
  | "path"
  | "food"
  | "vibe"
  | "live"
  | "maps"
  | "ads"
  | "youtube"
  | "team"
  | "note";

export type PlanPlatformId =
  | "instagram"
  | "facebook"
  | "meta"
  | "google"
  | "google_ads"
  | "maps"
  | "youtube"
  | "linkedin";

export const TRIBECA_PLAN = {
  title: "Marketing plan",
  eyebrow: "Bassik × Tribeca",
  oneLiner: "Discover → Desire → Visit.",

  pathTitle: "The path",
  path: [
    { icon: "food" as const, title: "Create", line: "Food, ambience, live nights." },
    { icon: "ads" as const, title: "Push", line: "Organic + Meta / Google / YouTube." },
    { icon: "team" as const, title: "Review", line: "Keep what works." },
  ],

  platformsTitle: "Where we show up",
  platforms: [
    { id: "instagram" as const, label: "Instagram" },
    { id: "facebook" as const, label: "Facebook" },
    { id: "meta" as const, label: "Meta ads" },
    { id: "google" as const, label: "Google" },
    { id: "google_ads" as const, label: "Google Ads" },
    { id: "maps" as const, label: "Google Maps" },
    { id: "youtube" as const, label: "YouTube" },
    { id: "linkedin" as const, label: "LinkedIn" },
  ],

  campaignsTitle: "Campaigns",
  campaigns: [
    {
      name: "Food & ambience",
      what: "Menu, interiors, cafe feel",
      channels: "Meta (Instagram, Facebook) · Google Maps",
    },
    {
      name: "Workshops & live",
      what: "Sessions and live nights",
      channels: "Meta (Instagram, Facebook)",
    },
    {
      name: "Corporate",
      what: "Parties, events, gatherings",
      channels: "LinkedIn · Meta · Google",
    },
    {
      name: "Footfall & local discovery",
      what: "Near me, area reach, maps",
      channels: "Google",
    },
  ],

  alwaysTitle: "Always on",
  alwaysLine: "Ambience · weekly content · events — always something ready.",
  always: [
    { title: "Ambience", line: "Cafe feel on rotation." },
    { title: "Weekly content", line: "Food & moments." },
    { title: "Events", line: "Live / workshop calendar." },
  ],

  notesTitle: "Notes",
  notes: [
    "We work together and grow together.",
    "Goal: reach the top in the market — digitally and in the real cafe.",
    "Great marketing comes from great ideas, real time investment, and clear thought — then disciplined execution. Not random steps.",
  ],

  bassikTitle: "Bassik",
  bassikLine: "Hospitality operators who also run digital — Hyderabad venues + brand growth for F&B.",

  leadershipTitle: "Leadership",
  leadership: [
    {
      name: "Venkat Kc",
      title: "Founder & CEO",
      bio: "25+ years in hospitality and nightlife. Built and shaped multiple Hyderabad destinations — including pioneering the city’s microbrewery culture through HyLife Brewing Co. Strong on brand growth, digital direction, nightlife & F&B concepts, and industry network.",
    },
    {
      name: "Anthony Lawrence",
      title: "Managing Director",
      bio: "30+ years in food & beverage, including 25+ years with 10 Downing Street as Franchise Head of Operations. Strong on F&B systems, service standards, commercial discipline, business development and team operations.",
    },
  ],
  leadershipLine:
    "Operators who also run digital growth — so Tribeca’s marketing stays practical.",
} as const;
