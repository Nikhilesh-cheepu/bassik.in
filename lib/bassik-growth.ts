import { bassikAgencyWhatsAppUrl } from "@/lib/bassik-agency";

/** Premium growth partnership — shared by public site + private /for-partners sales doc. */

export const GROWTH_BRAND_LINE = "We care about your growth";
export const GROWTH_BRAND_SUB =
  "Not your content calendar. Creatives and ads are tools — the product is more of the right people walking in, calling, or enquiring.";

export const GROWTH_SOFT_RANGE =
  "Investment starts from the prices above. Final fit after a short WhatsApp — ad spend is always separate.";

export const GROWTH_PROOF_LINE =
  "Trusted by Club Rogue, Firefly, C53, Boiler Room, and more in Hyderabad.";

export type GrowthVerticalId =
  | "clubs"
  | "restaurants"
  | "hotels"
  | "education"
  | "healthcare";

export type GrowthPathId = "care" | "growth" | "scale";

export const GROWTH_STEPS: ReadonlyArray<{
  id: string;
  title: string;
  meaning: string;
  levers: string;
}> = [
  {
    id: "attention",
    title: "Attention",
    meaning: "Right people see you",
    levers: "Creatives, Meta/Google, GMB, SEO",
  },
  {
    id: "trust",
    title: "Trust",
    meaning: "They believe you",
    levers: "Brand story, proof, reviews, atmosphere",
  },
  {
    id: "action",
    title: "Action",
    meaning: "They enquire, book, or visit",
    levers: "Landing pages, WhatsApp, forms, offers",
  },
  {
    id: "return",
    title: "Return",
    meaning: "They come back, enrol, or refer",
    levers: "Remarketing, CRM handoff, retention",
  },
];

export const GROWTH_PATHS: ReadonlyArray<{
  id: GrowthPathId;
  name: string;
  role: string;
  feel: string;
  badge: string | null;
  highlighted: boolean;
  includes: readonly string[];
}> = [
  {
    id: "care",
    name: "Care",
    role: "Flyers, reels & presence",
    feel: "Stay visible every week — static flyers, reels, Meta, and posting.",
    badge: null,
    highlighted: false,
    includes: [
      "Static flyers + reel creatives",
      "4 reels / month",
      "Social media posting",
      "Standard Meta ads",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    role: "Ads, leads & events",
    feel: "More creatives, custom ads, Google + Meta, leads, and event collabs.",
    badge: "Most partners",
    highlighted: true,
    includes: [
      "Flyers + 8 reels / month",
      "Custom Meta & Google ads",
      "Lead campaigns & handoff",
      "Event collaborations",
    ],
  },
  {
    id: "scale",
    name: "Revenue",
    role: "Revenue machine",
    feel: "We work the business with you — strategy, channels, and revenue focus.",
    badge: null,
    highlighted: false,
    includes: [
      "Everything in Growth",
      "Growth & revenue strategy",
      "Deeper ads + conversion focus",
      "Working together on the numbers",
    ],
  },
];

/** Public “starts from” floors — not the full industry matrix. */
export const GROWTH_FROM_PRICES: Record<GrowthPathId, string> = {
  care: "₹40,000",
  growth: "₹80,000",
  scale: "₹1,50,000",
};

/** Exact retainers by industry — /for-partners only. */
export const GROWTH_PRIVATE_PRICES: Record<
  GrowthVerticalId,
  Record<GrowthPathId, string>
> = {
  clubs: { care: "₹40,000", growth: "₹85,000", scale: "₹1,50,000" },
  restaurants: { care: "₹40,000", growth: "₹80,000", scale: "₹1,50,000" },
  hotels: { care: "₹45,000", growth: "₹95,000", scale: "₹1,75,000" },
  education: { care: "₹45,000", growth: "₹95,000", scale: "₹1,75,000" },
  healthcare: { care: "₹45,000", growth: "₹90,000", scale: "₹1,60,000" },
};

export const GROWTH_NEVER_INCLUDED = [
  "Ad media spend (always client-paid, separate)",
  "Unlimited revision loops",
  "Guaranteed admissions, occupancy, or footfall numbers",
  "Legacy “posts-only” club ops pricing",
] as const;

export const GROWTH_START_STEPS = [
  "Tell us your world (industry + one challenge)",
  "We map a 90-day Growth plan",
  "Start on WhatsApp — no long discovery theatre",
] as const;

export type GrowthVertical = {
  id: GrowthVerticalId;
  label: string;
  shortLabel: string;
  challengesHeading: string;
  challenges: readonly string[];
  growthMeans: string;
  weHelp: string;
  pathOutcomes: Record<GrowthPathId, string>;
};

export const GROWTH_VERTICALS: readonly GrowthVertical[] = [
  {
    id: "clubs",
    label: "Clubs / nightlife",
    shortLabel: "Clubs",
    challengesHeading: "What club owners feel every week",
    challenges: [
      "Empty weeknights while weekends depend on who posted",
      "Price wars and copycat flyers",
      "Freelancers who only drop creatives — no floor plan",
      "You’re stuck in WhatsApp all day",
    ],
    growthMeans: "Predictable weekend footfall and event awareness — not more random posts.",
    weHelp:
      "Motion for Fri–Sun, sharp week creatives, Meta for events, a calendar that matches the floor. Growth aims at tonight and this weekend.",
    pathOutcomes: {
      care: "Flyers, 4 reels, Meta & posting",
      growth: "8 reels, leads, Google + Meta, events",
      scale: "Revenue machine for the floor",
    },
  },
  {
    id: "restaurants",
    label: "Restaurants / food",
    shortLabel: "Restaurants",
    challengesHeading: "What restaurant owners feel",
    challenges: [
      "Delivery apps eat margin",
      "The feed looks dead between offers",
      "Promos don’t convert into covers",
      "No time to run content yourself",
    ],
    growthMeans: "More covers and orders from people who already like your cuisine.",
    weHelp:
      "Food story, reels, local Meta, and GMB. Growth pushes “near me” demand and offers that fill tables — not random aesthetics.",
    pathOutcomes: {
      care: "Flyers, 4 reels, Meta & posting",
      growth: "8 reels, leads, Google + Meta, offers",
      scale: "Revenue focus for covers & orders",
    },
  },
  {
    id: "hotels",
    label: "Hotels / resorts",
    shortLabel: "Hotels",
    challengesHeading: "What hotels and resorts feel",
    challenges: [
      "OTA commissions eat direct revenue",
      "Direct bookings stay weak",
      "The brand looks cheaper than the property",
      "Soft nights with no intentional demand",
    ],
    growthMeans: "More direct enquiries and better occupancy on soft nights.",
    weHelp:
      "Premium visuals plus Google/Meta for intent (“stay / brunch / resort near…”) and a clear WhatsApp or landing path. Often fewer posts, stronger ads.",
    pathOutcomes: {
      care: "Flyers, 4 reels, Meta & posting",
      growth: "8 reels, leads, Google + Meta",
      scale: "Revenue focus for direct bookings",
    },
  },
  {
    id: "education",
    label: "Education",
    shortLabel: "Education",
    challengesHeading: "What colleges and schools feel",
    challenges: [
      "Admission-season panic every year",
      "Portal leads that don’t convert",
      "No clear story for parents",
      "Trust gaps for govt and private alike",
    ],
    growthMeans: "Qualified admission enquiries your team can call — contacts, not vanity likes.",
    weHelp:
      "Campus/brand story, Meta/Google admission funnels, and a lead sheet handoff. We talk enquiries this month — never guaranteed seats.",
    pathOutcomes: {
      care: "Flyers, 4 reels, Meta & posting",
      growth: "8 reels, admission leads, Google + Meta",
      scale: "Revenue focus for admission season",
    },
  },
  {
    id: "healthcare",
    label: "Healthcare",
    shortLabel: "Healthcare",
    challengesHeading: "What hospitals and clinics feel",
    challenges: [
      "Patients Google competitors first",
      "Reviews and profiles look messy",
      "Ads feel spammy or risky",
      "Local demand doesn’t reach the right desk",
    ],
    growthMeans: "Appointment and consultation enquiries from the right locality.",
    weHelp:
      "Trust-first creatives, Google, GMB, and careful claims. Growth is local demand — not viral reels.",
    pathOutcomes: {
      care: "Flyers, 4 reels, Meta & posting",
      growth: "8 reels, appointment leads, Google + Meta",
      scale: "Revenue focus for appointments",
    },
  },
];

export function getGrowthVertical(id: GrowthVerticalId): GrowthVertical {
  return GROWTH_VERTICALS.find((v) => v.id === id) ?? GROWTH_VERTICALS[0];
}

export function bassikGrowthWhatsAppUrl(vertical?: GrowthVerticalId, path?: GrowthPathId): string {
  if (vertical && path) {
    const v = getGrowthVertical(vertical);
    const p = GROWTH_PATHS.find((x) => x.id === path)?.name ?? path;
    return bassikAgencyWhatsAppUrl(
      `Hi Bassik — I'm in ${v.label}. Interested in the ${p} path. Let's talk.`
    );
  }
  if (vertical) {
    const v = getGrowthVertical(vertical);
    return bassikAgencyWhatsAppUrl(
      `Hi Bassik — I'm in ${v.label}. I want to talk about growth.`
    );
  }
  return bassikAgencyWhatsAppUrl(
    "Hi Bassik — I want to talk about a Growth partnership."
  );
}
