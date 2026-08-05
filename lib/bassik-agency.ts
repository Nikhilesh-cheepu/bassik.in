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
    "Bassik is a growth partner for clubs, restaurants, hotels, education and healthcare — attention, trust, enquiries and footfall. Talk to us on WhatsApp. Hyderabad.",
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
