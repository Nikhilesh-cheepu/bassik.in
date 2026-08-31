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

/** Public homepage — Q + visual answer lines + voice. No pricing. */
export type GrowthMarketingBlock = {
  id: string;
  question: string;
  answerLines: readonly string[];
  voice: string;
  voiceBy: string;
  /** Portrait for voice card (Unsplash or local). */
  portrait: string;
  accent: "peach" | "lilac" | "sky" | "rose" | "mint";
  visual: "floor" | "calendar" | "signal" | "crew" | "proof";
};

const ACCENT: Record<GrowthMarketingBlock["accent"], { wash: string; ring: string; dot: string }> = {
  peach: { wash: "from-[#FFE8E0] to-[#FFF5F2]", ring: "ring-[#FFB4A2]/40", dot: "bg-[#FFB4A2]" },
  lilac: { wash: "from-[#F0EBFF] to-[#F7F5FF]", ring: "ring-[#C4B5FD]/45", dot: "bg-[#C4B5FD]" },
  sky: { wash: "from-[#E8F2FF] to-[#F5FAFF]", ring: "ring-[#A5C8FF]/50", dot: "bg-[#A5C8FF]" },
  rose: { wash: "from-[#FFE8F0] to-[#FFF5F8]", ring: "ring-[#F5A3C7]/45", dot: "bg-[#F5A3C7]" },
  mint: { wash: "from-[#E8FFF5] to-[#F5FFFA]", ring: "ring-[#86EFAC]/40", dot: "bg-[#86EFAC]" },
};

export function growthBlockAccent(block: GrowthMarketingBlock) {
  return ACCENT[block.accent];
}

export const GROWTH_360_LAYERS = [
  "Brand story",
  "Creatives & shoots",
  "Social posting",
  "Meta & Google ads",
  "Lead generation",
  "Conversion paths",
] as const;

export const GROWTH_MARKETING_BLOCKS: readonly GrowthMarketingBlock[] = [
  {
    id: "who-runs-marketing",
    question: "You're running the business. Who's running the marketing?",
    answerLines: [
      "Strategy + calendar — owned by Bassik",
      "Flyers, reels, social — done for you",
      "Meta & Google — live and optimised",
      "Scroll → enquiry — clear path",
    ],
    voice: "I was approving flyers at midnight. Now I run the room — they run the marketing.",
    voiceBy: "Club owner · Hyderabad",
    portrait:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=240&h=240&q=80",
    accent: "peach",
    visual: "floor",
  },
  {
    id: "weekends-only",
    question: "Weekends are packed. Why are the other days still dead?",
    answerLines: [
      "Week planned like a launch — not random posts",
      "Right day, right creative, right audience",
      "Weekday demand — built on purpose",
      "Footfall you can read on the calendar",
    ],
    voice: "Footfall used to depend on luck. Now quiet nights have a plan behind them.",
    voiceBy: "Restaurant owner",
    portrait:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=240&h=240&q=80",
    accent: "lilac",
    visual: "calendar",
  },
  {
    id: "looks-good-feels-dead",
    question: "The place looks great in person. Why doesn't the phone ring?",
    answerLines: [
      "Online story matches how guests feel in person",
      "Proof, reviews, atmosphere — visible",
      "Ads that push calls & bookings",
      "Not likes — enquiries",
    ],
    voice: "We looked premium live but cheap on Google. Bassik fixed how we show up online.",
    voiceBy: "Hotel · banquets",
    portrait:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=240&h=240&q=80",
    accent: "sky",
    visual: "signal",
  },
  {
    id: "freelancer-chaos",
    question: "Tired of chasing freelancers for every drop?",
    answerLines: [
      "One team owns the full calendar",
      "Event drops — planned, not panicked",
      "Creatives + ads + handoff — together",
      "You announce — we’re already ready",
    ],
    voice: "Artist confirmed Tuesday, poster needed Wednesday. That cycle stopped.",
    voiceBy: "Events · nightlife",
    portrait:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=240&h=240&q=80",
    accent: "rose",
    visual: "crew",
  },
  {
    id: "will-it-work",
    question: "Will this actually move the business?",
    answerLines: [
      "Enquiries, bookings, footfall — our scorecard",
      "Club Rogue · Firefly · C53 · Boiler Room",
      "Hyderabad hospitality — we know the floor",
      "Growth partner — not a post vendor",
    ],
    voice: "They don't sell posts. They show up like a team that wants your business to grow.",
    voiceBy: "Partner brand",
    portrait:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=240&h=240&q=80",
    accent: "mint",
    visual: "proof",
  },
];

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
