import { BRANDS, HIDDEN_BRAND_IDS, type Brand } from "@/lib/brands";
import { getFullPhoneNumber } from "@/lib/outlet-contacts";
import { whatsAppShareUrl } from "@/lib/team-whatsapp-report";

/** HQ contact — override with BASSIK_HQ_PHONE. */
export const BASSIK_HQ_PHONE =
  process.env.NEXT_PUBLIC_BASSIK_HQ_PHONE?.trim() ||
  process.env.BASSIK_HQ_PHONE?.trim() ||
  "7013884485";

export const BASSIK_AGENCY_WA_MESSAGE =
  "Hi Bassik — I'd like to discuss a digital marketing campaign for my brand.";

export const BASSIK_INVEST_WA_MESSAGE =
  "Hi Bassik — I'd like to explore a hospitality partnership with Bassik.";

export function bassikAgencyWhatsAppUrl(message = BASSIK_AGENCY_WA_MESSAGE): string {
  return whatsAppShareUrl(message, getFullPhoneNumber(BASSIK_HQ_PHONE));
}

export function bassikInvestWhatsAppUrl(): string {
  return bassikAgencyWhatsAppUrl(BASSIK_INVEST_WA_MESSAGE);
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
export const AGENCY_TAGLINE = "A premium digital marketing agency for brands that want to grow.";

export const AGENCY_HERO_SUPPORT =
  "Full-funnel advertising, campaign creative, and growth systems — planned around your market, not guesswork.";

export const AGENCY_SEO = {
  title: "Bassik | Premium Digital Marketing Agency",
  description:
    "Bassik is a premium digital marketing agency. We plan and run advertising across major platforms, craft high-performing campaigns for fitness, F&B, nightlife and local brands, and help you outperform competitors with strategy and creative.",
  keywords: [
    "digital marketing agency Hyderabad",
    "premium digital marketing agency India",
    "performance advertising agency",
    "paid media Meta Google YouTube",
    "brand campaign agency",
    "gym and fitness marketing",
    "F&B marketing agency",
    "Bassik",
  ],
} as const;

export type AgencyServiceId = "ads" | "creatives" | "social" | "seo";

export const AGENCY_SERVICES_HEADING = "What we deliver";
export const AGENCY_SERVICES_TITLE = "Advertising and campaigns that move the business.";

export const AGENCY_SERVICES: ReadonlyArray<{
  id: AgencyServiceId;
  title: string;
  body: string;
}> = [
  {
    id: "ads",
    title: "Performance advertising",
    body: "Media across Meta, Google, YouTube, LinkedIn, and more — bought and optimized where your customers actually decide.",
  },
  {
    id: "creatives",
    title: "Campaign creative",
    body: "Reels, films, posters, and assets built to look premium in the feed and convert when attention is scarce.",
  },
  {
    id: "social",
    title: "Social presence",
    body: "A clear content rhythm so your brand stays visible every week — without chaos for your team.",
  },
  {
    id: "seo",
    title: "Search & discovery",
    body: "Visibility when people look for you — so growth is not only paid, and not only owned by aggregators.",
  },
];

export type AgencyVerticalId = "gym" | "fnb" | "nightlife" | "local";

export const AGENCY_VERTICALS_HEADING = "Industries";
export const AGENCY_VERTICALS_TITLE = "Built for brands that live offline and win online.";

export const AGENCY_VERTICALS: ReadonlyArray<{
  id: AgencyVerticalId;
  title: string;
  body: string;
}> = [
  { id: "gym", title: "Fitness & gyms", body: "Trials, memberships, and offer-led growth." },
  { id: "fnb", title: "F&B & cafés", body: "Footfall, events, and weekday demand." },
  { id: "nightlife", title: "Nightlife & hospitality", body: "Nights, covers, and brand heat." },
  { id: "local", title: "Local & lifestyle", body: "Category leaders in their city." },
];

export const AGENCY_TRUST_HEADING = "How we work with you";
export const AGENCY_TRUST_TITLE = "Clarity first. Then campaigns that compete.";

export const AGENCY_TRUST: ReadonlyArray<{
  id: "story" | "competitors" | "pro";
  title: string;
  body: string;
}> = [
  {
    id: "story",
    title: "Understand the brand",
    body: "We start with your story, offer, and audience — so every campaign has a reason to exist.",
  },
  {
    id: "competitors",
    title: "Map the competition",
    body: "We study what rivals are running, where they are weak, and where you can take the lead.",
  },
  {
    id: "pro",
    title: "Stay focused on the brand",
    body: "You keep the vision. We own the execution — strategy, creative, media, and iteration.",
  },
];

export const AGENCY_STEPS_HEADING = "Process";
export const AGENCY_STEPS_TITLE = "From brief to scale — without the noise.";

export const AGENCY_STEPS = [
  { step: "01", title: "Discover", body: "Brand, goals, and market reality." },
  { step: "02", title: "Create", body: "Strategy, creative, and media plan." },
  { step: "03", title: "Scale", body: "Double down on what performs." },
] as const;

export const AGENCY_WORK_HEADING = "Selected work";
export const AGENCY_WORK_TITLE = "Brands that trusted Bassik with their campaigns.";

export const AGENCY_HOSPITALITY_HEADING = "Beyond the agency";
export const AGENCY_HOSPITALITY_TITLE = "Hospitality ventures with Bassik.";
export const AGENCY_HOSPITALITY_BODY =
  "Alongside client work, we build hospitality concepts of our own. Partners who want skin in the game — talk to us.";

export const AGENCY_CONTACT_TITLE = "Let’s build your next campaign.";
export const AGENCY_CONTACT_BODY = "Share your brand and goal. We’ll reply on WhatsApp.";
