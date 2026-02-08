export type Brand = {
  id: string;
  name: string;
  shortName: string;
  accentColor: string;
  exploreUrl: string;
  instagramUrls: string[]; // Array to support multiple Instagram profiles (e.g., Club Rogue)
  websiteUrl: string; // Official website URL
  description?: string; // One-line description for homepage
  tag?: string; // Optional tag (e.g., "Club", "Sports Bar")
  /** Override logo path (e.g. for "THE HUB all.png") */
  logoPath?: string;
  /** Show "book a table at these spots" section with partner logos (e.g. The Hub) */
  showSpotsSection?: boolean;
};

export const BRANDS: Brand[] = [
  {
    id: "the-hub",
    name: "The Hub",
    shortName: "The Hub",
    accentColor: "#F59E0B",
    exploreUrl: "#",
    instagramUrls: [],
    websiteUrl: "#",
    description: "Live screening on the biggest screen in Hyderabad",
    tag: "Live Screening",
    logoPath: "/logos/THE%20HUB%20all.png",
    showSpotsSection: true,
  },
  {
    id: "alehouse",
    name: "Alehouse",
    shortName: "Alehouse",
    accentColor: "#d4af37",
    exploreUrl: "https://www.alehouse.club",
    instagramUrls: ["https://www.instagram.com/alehouse.club/"],
    websiteUrl: "https://www.alehouse.club",
    description: "Medieval tavern club • Cocktails • Late nights",
    tag: "Fine Dining",
  },
  {
    id: "c53",
    name: "C53 World Cuisine",
    shortName: "C53",
    accentColor: "#E4572E",
    exploreUrl: "#",
    instagramUrls: ["https://www.instagram.com/c53wc/"],
    websiteUrl: "https://example.com/c53", // TODO: Replace with real website URL
    description: "World cuisine dining • Family friendly",
    tag: "Fine Dining",
  },
  {
    id: "boiler-room",
    name: "Boiler Room",
    shortName: "Boiler Room",
    accentColor: "#ff6b3d",
    exploreUrl: "#",
    instagramUrls: ["https://www.instagram.com/boilerroomhyd/"],
    websiteUrl: "https://example.com/boilerroom", // TODO: Replace with real website URL
    description: "Underground club vibe • DJ nights",
    tag: "Casual Bar",
  },
  {
    id: "skyhy",
    name: "SkyHy Live",
    shortName: "SkyHy",
    accentColor: "#4FD1C5",
    exploreUrl: "#",
    instagramUrls: ["https://www.instagram.com/skyhylive/"],
    websiteUrl: "https://example.com/skyhy", // TODO: Replace with real website URL
    description: "Rooftop lounge • City views",
    tag: "Rooftop",
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
    description: "Sports bar • Bowling • Drinks",
    tag: "Sports Bar",
  },
  {
    id: "club-rogue-gachibowli",
    name: "clubrogue - gachibowli",
    shortName: "clubrogue - gachibowli",
    accentColor: "#F97316",
    exploreUrl: "#",
    instagramUrls: ["https://www.instagram.com/clubrogue.gachibowli/"],
    websiteUrl: "https://example.com/clubrogue", // TODO: Replace with real website URL
    description: "Club nights • Signature cocktails",
    tag: "Club",
  },
  {
    id: "club-rogue-kondapur",
    name: "clubrogue - kondapur",
    shortName: "clubrogue - kondapur",
    accentColor: "#EC4899",
    exploreUrl: "#",
    instagramUrls: ["https://www.instagram.com/clubrogue.kondapur/"],
    websiteUrl: "https://example.com/clubrogue", // TODO: Replace with real website URL
    description: "Club nights • Signature cocktails",
    tag: "Club",
  },
  {
    id: "club-rogue-jubilee-hills",
    name: "clubrogue - jublieehills",
    shortName: "clubrogue - jublieehills",
    accentColor: "#A855F7",
    exploreUrl: "#",
    instagramUrls: ["https://www.instagram.com/clubrogue.jubileehills/"],
    websiteUrl: "https://example.com/clubrogue", // TODO: Replace with real website URL
    description: "Club nights • Signature cocktails",
    tag: "Club",
  },
  {
    id: "sound-of-soul",
    name: "Sound of Soul Club & Kitchen",
    shortName: "Sound of Soul",
    accentColor: "#D4A574",
    exploreUrl: "#",
    instagramUrls: ["https://www.instagram.com/soundofsoulclub/"],
    websiteUrl: "https://example.com/soundofsoul", // TODO: Replace with real website URL
    description: "Club nights • Live music",
    tag: "Club",
  },
  {
    id: "rejoy",
    name: "Rejoy Club",
    shortName: "Rejoy",
    accentColor: "#FBBF24",
    exploreUrl: "#",
    instagramUrls: ["https://www.instagram.com/rejoyclub/"],
    websiteUrl: "https://example.com/rejoy", // TODO: Replace with real website URL
    description: "Club nights • Party vibes",
    tag: "Club",
  },
  {
    id: "firefly",
    name: "Firefly Club & Socialroom",
    shortName: "Firefly",
    accentColor: "#D97706",
    exploreUrl: "#",
    instagramUrls: ["https://www.instagram.com/fireflyclub/"],
    websiteUrl: "https://example.com/firefly", // TODO: Replace with real website URL
    description: "Club nights • Social vibes",
    tag: "Club",
  },
];

// Helper: Get unique brands for homepage "Connect" section
// Returns all brands separately, including all 3 Club Rogue locations
export const getHomepageConnectBrands = () => {
  return BRANDS;
};
