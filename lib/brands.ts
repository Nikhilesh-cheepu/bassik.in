export type Brand = {
  id: string;
  name: string;
  shortName: string;
  accentColor: string;
  exploreUrl: string;
  instagramUrls: string[]; // Array to support multiple Instagram profiles (e.g., Club Rogue)
  websiteUrl: string; // Official website URL
};

export const BRANDS: Brand[] = [
  {
    id: "alehouse",
    name: "Alehouse",
    shortName: "Alehouse",
    accentColor: "#d4af37",
    exploreUrl: "https://www.alehouse.club",
    instagramUrls: ["https://www.instagram.com/alehouse.club/"],
    websiteUrl: "https://www.alehouse.club",
  },
  {
    id: "c53",
    name: "C53 World Cuisine",
    shortName: "C53",
    accentColor: "#E4572E",
    exploreUrl: "#",
    instagramUrls: ["https://www.instagram.com/c53wc/"],
    websiteUrl: "https://example.com/c53", // TODO: Replace with real website URL
  },
  {
    id: "boiler-room",
    name: "Boiler Room",
    shortName: "Boiler Room",
    accentColor: "#ff6b3d",
    exploreUrl: "#",
    instagramUrls: ["https://www.instagram.com/boilerroomhyd/"],
    websiteUrl: "https://example.com/boilerroom", // TODO: Replace with real website URL
  },
  {
    id: "skyhy",
    name: "SkyHy Live",
    shortName: "SkyHy",
    accentColor: "#4FD1C5",
    exploreUrl: "#",
    instagramUrls: ["https://www.instagram.com/skyhylive/"],
    websiteUrl: "https://example.com/skyhy", // TODO: Replace with real website URL
  },
  {
    id: "kiik69",
    name: "KIIK 69 Sports Bar",
    shortName: "KIIK 69",
    accentColor: "#FBBF24",
    exploreUrl: "https://www.kiik69.com",
    instagramUrls: [
      "https://www.instagram.com/kiik69sportsbar.gachibowli/",
    ],
    websiteUrl: "https://www.kiik69.com",
  },
  {
    id: "club-rogue-gachibowli",
    name: "Club Rogue – Gachibowli",
    shortName: "Gachibowli",
    accentColor: "#F97316",
    exploreUrl: "#",
    instagramUrls: ["https://www.instagram.com/clubrogue.gachibowli/"],
    websiteUrl: "https://example.com/clubrogue", // TODO: Replace with real website URL
  },
  {
    id: "club-rogue-kondapur",
    name: "Club Rogue – Kondapur",
    shortName: "Kondapur",
    accentColor: "#EC4899",
    exploreUrl: "#",
    instagramUrls: ["https://www.instagram.com/clubrogue.kondapur/"],
    websiteUrl: "https://example.com/clubrogue", // TODO: Replace with real website URL
  },
  {
    id: "club-rogue-jubilee-hills",
    name: "Club Rogue – Jubilee Hills",
    shortName: "Jubilee Hills",
    accentColor: "#A855F7",
    exploreUrl: "#",
    instagramUrls: ["https://www.instagram.com/clubrogue.jubileehills/"],
    websiteUrl: "https://example.com/clubrogue", // TODO: Replace with real website URL
  },
  {
    id: "sound-of-soul",
    name: "Sound of Soul Club & Kitchen",
    shortName: "Sound of Soul",
    accentColor: "#D4A574",
    exploreUrl: "#",
    instagramUrls: ["https://www.instagram.com/soundofsoulclub/"],
    websiteUrl: "https://example.com/soundofsoul", // TODO: Replace with real website URL
  },
  {
    id: "rejoy",
    name: "Rejoy Club",
    shortName: "Rejoy",
    accentColor: "#FBBF24",
    exploreUrl: "#",
    instagramUrls: ["https://www.instagram.com/rejoyclub/"],
    websiteUrl: "https://example.com/rejoy", // TODO: Replace with real website URL
  },
  {
    id: "firefly",
    name: "Firefly Club & Socialroom",
    shortName: "Firefly",
    accentColor: "#D97706",
    exploreUrl: "#",
    instagramUrls: ["https://www.instagram.com/fireflyclub/"],
    websiteUrl: "https://example.com/firefly", // TODO: Replace with real website URL
  },
];

// Helper: Get unique brands for homepage "Connect" section
// Returns all brands separately, including all 3 Club Rogue locations
export const getHomepageConnectBrands = () => {
  return BRANDS;
};
