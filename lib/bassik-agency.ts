import { BRANDS, HIDDEN_BRAND_IDS, type Brand } from "@/lib/brands";
import { getFullPhoneNumber } from "@/lib/outlet-contacts";
import { whatsAppShareUrl } from "@/lib/team-whatsapp-report";

/** HQ contact — override with BASSIK_HQ_PHONE. */
export const BASSIK_HQ_PHONE =
  process.env.NEXT_PUBLIC_BASSIK_HQ_PHONE?.trim() ||
  process.env.BASSIK_HQ_PHONE?.trim() ||
  "7013884485";

export const BASSIK_AGENCY_WA_MESSAGE =
  "Hi Bassik — I want to talk about a Growth partnership.";

export const BASSIK_INVEST_WA_MESSAGE =
  "Hi Bassik — I'd like to explore a hospitality partnership with Bassik.";

export function bassikAgencyWhatsAppUrl(message = BASSIK_AGENCY_WA_MESSAGE): string {
  return whatsAppShareUrl(message, getFullPhoneNumber(BASSIK_HQ_PHONE));
}

export function bassikInvestWhatsAppUrl(): string {
  return bassikAgencyWhatsAppUrl(BASSIK_INVEST_WA_MESSAGE);
}

export function bassikPackageWhatsAppUrl(packageName: string): string {
  return bassikAgencyWhatsAppUrl(
    `Hi Bassik — I'm interested in the ${packageName} path. Let's talk.`
  );
}

/** /grow lead page — open chat with captured details. */
export function bassikGrowLeadWhatsAppUrl(params: {
  name: string;
  phone: string;
  business?: string;
}): string {
  const name = params.name.trim() || "there";
  const phone = params.phone.trim();
  const business = params.business?.trim();
  const biz = business ? ` Business: ${business}.` : "";
  return bassikAgencyWhatsAppUrl(
    `Hi Bassik — I'm ${name}, ${phone}.${biz} I struggle with marketing vs growth. Let's talk 360° marketing.`
  );
}

export const BASSIK_GROW_WA_SHORT =
  "Hi Bassik — I want help growing my business with 360° marketing. Let's talk.";

export function bassikGrowShortWhatsAppUrl(): string {
  return bassikAgencyWhatsAppUrl(BASSIK_GROW_WA_SHORT);
}

/** Prefill when they only shared a callback number. */
export function bassikGrowNumberWhatsAppUrl(phone: string): string {
  const cleaned = phone.replace(/\D/g, "").slice(-10);
  return bassikAgencyWhatsAppUrl(
    `Hi Bassik — please get back to me on WhatsApp: ${cleaned}. I want help with 360° marketing / business growth.`
  );
}

export const GROW_SEO = {
  title: "Bassik | Stuck between marketing and growing the business?",
  description:
    "Bassik helps clubs, cafés and local brands with 360° marketing, lead generation and conversion — so you can run the room while we handle the rest. Free growth chat on WhatsApp.",
} as const;

export const GROW_STACK: ReadonlyArray<{ title: string; body: string }> = [
  { title: "Brand & story", body: "We learn who you are, then build what guests feel." },
  { title: "360° marketing", body: "Planning, shoots, content, social, ads, artists & events." },
  { title: "Lead generation", body: "Campaigns that bring enquiries and footfall — not vanity likes." },
  { title: "Conversion", body: "Pages, offers and paths that turn interest into bookings." },
];

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

export const AGENCY_SEO = {
  title: "Bassik | We care about your growth",
  description:
    "Bassik is a growth marketing partner for clubs, restaurants, hotels, education and healthcare — real stories, real problems, real help. Talk to us on WhatsApp. Hyderabad.",
  keywords: [
    "growth marketing Hyderabad",
    "hospitality marketing partner",
    "education admission leads",
    "restaurant local ads",
    "club marketing Hyderabad",
    "Bassik",
  ],
} as const;

/** Soft Siri palette — no gold */
export const AGENCY_COLORS = {
  canvas: "#F7F5F8",
  pure: "#FFFFFF",
  ink: "#12131A",
  muted: "#6B6570",
  line: "#E6E1E8",
  night: "#0E0D12",
  peach: "#FFB4A2",
  rose: "#F5A3C7",
  lilac: "#C4B5FD",
  sky: "#A5C8FF",
  mist: "#EDE9FE",
  contentWash: "#F3EEFF",
} as const;

export const AGENCY_TAGLINE = "We care about your growth";

export const AGENCY_HERO_SUPPORT =
  "Bassik helps clubs, restaurants, hotels, education and healthcare grow — we stay with you. Pick Care, Growth, or Revenue and talk to us on WhatsApp.";

export const AGENCY_PROOF_LINE =
  "Trusted by Club Rogue, Firefly, C53, Boiler Room, and more in Hyderabad.";

export const AGENCY_STORY = {
  brand: "From the floor",
  quote:
    "Once Bassik owned the stack, we stopped juggling freelancers and started running the floor. Story, shoots, posts, ads — one thread.",
  attribution: "Hospitality partners · Hyderabad",
} as const;

export const AGENCY_WORK_HEADING = "Already with us";

export const AGENCY_CONTACT_TITLE = "Tell us your world.";
export const AGENCY_CONTACT_BODY =
  "Most people WhatsApp us. We’ll map the right path — Care, Growth, or Revenue — after a short conversation.";
