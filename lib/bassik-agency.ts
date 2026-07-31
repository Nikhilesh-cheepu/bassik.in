import { BRANDS, HIDDEN_BRAND_IDS, type Brand } from "@/lib/brands";
import { getFullPhoneNumber } from "@/lib/outlet-contacts";
import { whatsAppShareUrl } from "@/lib/team-whatsapp-report";

/** HQ contact — override with BASSIK_HQ_PHONE. */
export const BASSIK_HQ_PHONE =
  process.env.NEXT_PUBLIC_BASSIK_HQ_PHONE?.trim() ||
  process.env.BASSIK_HQ_PHONE?.trim() ||
  "7013884485";

export const BASSIK_AGENCY_WA_MESSAGE =
  "Hi Bassik — I'd like to discuss a marketing package for my brand.";

export const BASSIK_INVEST_WA_MESSAGE =
  "Hi Bassik — I'd like to explore a hospitality partnership with Bassik.";

export const BASSIK_AUDIT_WA_MESSAGE =
  "Hi Bassik — I'd like a free hospitality marketing audit.";

export function bassikAgencyWhatsAppUrl(message = BASSIK_AGENCY_WA_MESSAGE): string {
  return whatsAppShareUrl(message, getFullPhoneNumber(BASSIK_HQ_PHONE));
}

export function bassikInvestWhatsAppUrl(): string {
  return bassikAgencyWhatsAppUrl(BASSIK_INVEST_WA_MESSAGE);
}

export function bassikAuditWhatsAppUrl(): string {
  return bassikAgencyWhatsAppUrl(BASSIK_AUDIT_WA_MESSAGE);
}

export function bassikPackageWhatsAppUrl(packageName: string): string {
  return bassikAgencyWhatsAppUrl(
    `Hi Bassik — I'm interested in the ${packageName} package.`
  );
}

/** Unique client marks for portfolio (one logo per Club Rogue family). */
export function getAgencyPortfolioBrands(): Brand[] {
  const seen = new Set<string>();
  const out: Brand[] = [];
  for (const brand of BRANDS) {
    if (HIDDEN_BRAND_IDS.has(brand.id)) continue;
    const key = brand.id.startsWith("club-rogue") ? "club-rogue" : brand.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(
      brand.id.startsWith("club-rogue")
        ? { ...brand, shortName: "Club Rogue", name: "Club Rogue" }
        : brand
    );
  }
  return out;
}

/** Hero supporting line under the Bassik name */
export const AGENCY_TAGLINE = "Marketing that fills seats — not just feeds.";

export const AGENCY_HERO_SUPPORT =
  "Posters, reels, shoots, social, and ads for clubs, cafés, and local brands. Start light. Scale when you're ready.";

export const AGENCY_SEO = {
  title: "Bassik | Marketing Packages for Clubs, Cafés & Local Brands",
  description:
    "Bassik marketing packages for hospitality and local brands — social posting, content shoots, reels, Meta & Google ads. Starter plans from ₹15,000/month in Hyderabad.",
  keywords: [
    "digital marketing agency Hyderabad",
    "club marketing packages",
    "restaurant social media agency",
    "content shoot reels package",
    "Meta Google ads hospitality",
    "F&B marketing agency",
    "nightlife marketing Hyderabad",
    "Bassik",
  ],
} as const;

export type AgencyServiceId = "content" | "social" | "ads" | "discovery";

export const AGENCY_SERVICES_HEADING = "360° cover";
export const AGENCY_SERVICES_TITLE = "Everything your brand needs to show up and convert.";

export const AGENCY_SERVICES: ReadonlyArray<{
  id: AgencyServiceId;
  title: string;
  body: string;
}> = [
  {
    id: "content",
    title: "Shoot & reels",
    body: "On-ground shoots, edits, and short-form video built for Instagram and ads.",
  },
  {
    id: "social",
    title: "Social handling",
    body: "Posters, flyers, stories, and a posting calendar your team does not have to chase.",
  },
  {
    id: "ads",
    title: "Paid growth",
    body: "Meta, Google, and event pushes — BookMyShow collabs and offer campaigns when you need volume.",
  },
  {
    id: "discovery",
    title: "Find & book",
    body: "Maps, SEO, landing pages, and reservation funnels so discovery turns into footfall.",
  },
];

export type AgencyPackageId = "starter" | "content" | "growth" | "revenue";

export const AGENCY_PACKAGES_HEADING = "Packages";
export const AGENCY_PACKAGES_TITLE = "Start cheap. Upgrade when content and ads start paying back.";
export const AGENCY_PACKAGES_SUPPORT =
  "Most brands begin with Starter. When the feed needs heat, Content is the move everyone asks for.";

export const AGENCY_PACKAGES: ReadonlyArray<{
  id: AgencyPackageId;
  name: string;
  priceLabel: string;
  priceNote: string;
  outcome: string;
  badge: string | null;
  highlighted: boolean;
  includes: readonly string[];
  cta: string;
}> = [
  {
    id: "starter",
    name: "Starter",
    priceLabel: "₹15,000",
    priceNote: "/ month",
    outcome: "Stay visible every week — posters, flyers, and clean social posting.",
    badge: "Best to begin",
    highlighted: false,
    includes: [
      "12 posters / flyers",
      "8 social posts",
      "Daily stories support",
      "Monthly content calendar",
      "Basic community replies",
    ],
    cta: "Get Starter",
  },
  {
    id: "content",
    name: "Content",
    priceLabel: "₹35,000",
    priceNote: "/ month",
    outcome: "The package brands actually want — shoots, reels, and edits that stop the scroll.",
    badge: "Most demanded",
    highlighted: true,
    includes: [
      "2 content shoot days",
      "16 reels (shot + edited)",
      "Video edits for ads & organic",
      "Story + highlight packs",
      "Poster set from shoot stills",
      "Usage-ready vertical cuts",
    ],
    cta: "Get Content",
  },
  {
    id: "growth",
    name: "Growth",
    priceLabel: "₹60,000",
    priceNote: "/ month",
    outcome: "Content plus Meta ads and event rollout — built for weekend footfall.",
    badge: null,
    highlighted: false,
    includes: [
      "Everything in Content",
      "Full social handling",
      "Meta ads management",
      "Event creative rollout",
      "Influencer coordination",
      "WhatsApp broadcast creatives",
      "Monthly performance review",
    ],
    cta: "Get Growth",
  },
  {
    id: "revenue",
    name: "Revenue",
    priceLabel: "₹1,20,000",
    priceNote: "/ month",
    outcome: "Full-funnel partner — ads, SEO, pages, and strategy that aim at reservations.",
    badge: null,
    highlighted: false,
    includes: [
      "Everything in Growth",
      "Google Ads management",
      "Local SEO + GMB",
      "Landing / booking pages",
      "BookMyShow & listing creatives",
      "Weekly strategy check-ins",
      "Lead & reservation funnel",
    ],
    cta: "Get Revenue",
  },
];

export type AgencyVerticalId = "gym" | "fnb" | "nightlife" | "local";

export const AGENCY_VERTICALS_HEADING = "Built for";
export const AGENCY_VERTICALS_TITLE = "Clubs, cafés, gyms, and local brands.";

export const AGENCY_VERTICALS: ReadonlyArray<{
  id: AgencyVerticalId;
  title: string;
  body: string;
}> = [
  { id: "nightlife", title: "Nightlife", body: "Nights, covers, event heat." },
  { id: "fnb", title: "F&B & cafés", body: "Footfall and weekday demand." },
  { id: "gym", title: "Fitness", body: "Trials and memberships." },
  { id: "local", title: "Local brands", body: "City-first category plays." },
];

export const AGENCY_STEPS_HEADING = "How it works";
export const AGENCY_STEPS_TITLE = "Simple. Fast. On WhatsApp.";

export const AGENCY_STEPS = [
  { step: "01", title: "Pick a package", body: "Starter, Content, Growth, or Revenue." },
  { step: "02", title: "Quick brief", body: "Brand, dates, and what “win” looks like." },
  { step: "03", title: "We ship", body: "Calendar, creatives, shoots, ads — handled." },
] as const;

export const AGENCY_WORK_HEADING = "Trusted by";
export const AGENCY_WORK_TITLE = "Brands that already run with Bassik.";

export const AGENCY_HOSPITALITY_HEADING = "Beyond the agency";
export const AGENCY_HOSPITALITY_TITLE = "Hospitality ventures with Bassik.";
export const AGENCY_HOSPITALITY_BODY =
  "Alongside client work, we build hospitality concepts of our own. Partners who want skin in the game — talk to us.";

export const AGENCY_CONTACT_TITLE = "Tell us what you need.";
export const AGENCY_CONTACT_BODY =
  "Starter for posting. Content for reels & shoots. Growth when you want ads. Reply in minutes on WhatsApp.";
