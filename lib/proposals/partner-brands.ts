export type ProposalPartnerBrand = {
  name: string;
  subtitle?: string;
  logoPath: string;
  /** White tile bg for logos that sit on black (so they read on the dark UI). */
  lightBg?: boolean;
};

export type ProposalBrandGroup = {
  id: "own" | "working" | "worked";
  title: string;
  brands: ProposalPartnerBrand[];
};

/** Brands we own */
export const BRANDS_WE_OWN: ProposalPartnerBrand[] = [
  { name: "Alehouse", logoPath: "/logos/alehouse.png" },
  { name: "Boiler Room", logoPath: "/logos/boiler-room.png" },
  { name: "C53 World Cuisine", logoPath: "/logos/c53.png" },
  { name: "KiiK 69 Sports Bar", logoPath: "/logos/kiik69.png" },
  { name: "SkyHy Live", logoPath: "/logos/skyhy.png" },
  { name: "Sound of Soul", logoPath: "/logos/sound-of-soul.png" },
];

/** Brands we are working with */
export const BRANDS_WORKING_WITH: ProposalPartnerBrand[] = [
  { name: "Club Rogue", subtitle: "Gachibowli", logoPath: "/logos/club-rogue.png" },
  { name: "Club Rogue", subtitle: "Kondapur", logoPath: "/logos/club-rogue.png" },
  { name: "Club Rogue", subtitle: "Jubilee Hills", logoPath: "/logos/club-rogue.png" },
  { name: "IHM Hyderabad", logoPath: "/logos/ihm-hyderabad.jpg", lightBg: true },
  { name: "Komma – The Club", logoPath: "/logos/komma.jpg", lightBg: true },
  { name: "Tribeca Cafe", logoPath: "/logos/tribeca.png", lightBg: true },
];

/** Brands we worked with */
export const BRANDS_WE_WORKED_WITH: ProposalPartnerBrand[] = [
  { name: "HyLife Brewing Co.", logoPath: "/logos/hylife.jpg" },
  { name: "Over The Moon", logoPath: "/logos/over-the-moon.jpg", lightBg: true },
  { name: "Repete Brewery", logoPath: "/logos/repete.jpg", lightBg: true },
  { name: "Vapour Brewpub", logoPath: "/logos/vapour.jpg", lightBg: true },
  { name: "Artistry", logoPath: "/logos/artistry.jpg" },
  { name: "Sip of Sky", logoPath: "/logos/sip-of-sky.jpg" },
];

/** Own → Working with → Worked with */
export const PROPOSAL_BRAND_GROUPS: ProposalBrandGroup[] = [
  { id: "own", title: "Own", brands: BRANDS_WE_OWN },
  { id: "working", title: "Working with", brands: BRANDS_WORKING_WITH },
  { id: "worked", title: "Worked with", brands: BRANDS_WE_WORKED_WITH },
];

export const BASSIK_PARTNER_BRANDS: ProposalPartnerBrand[] = [
  ...BRANDS_WE_OWN,
  ...BRANDS_WORKING_WITH,
  ...BRANDS_WE_WORKED_WITH,
];
