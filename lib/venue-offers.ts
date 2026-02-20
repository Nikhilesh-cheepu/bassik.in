/**
 * Events & offers per venue (static for now; can be moved to DB/API later).
 */
export type VenueOffer = {
  id: string;
  venueSlug: string;
  imageUrl: string;
  title: string;
  description: string;
  startDate?: string; // ISO date or display string
  endDate?: string;
  ctaLabel?: string;
  ctaLink?: string;
};

export const VENUE_OFFERS: VenueOffer[] = [
  {
    id: "the-hub-1",
    venueSlug: "the-hub",
    imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80",
    title: "LIVE SCREENING ON THE BIGGEST SCREEN",
    description: "The Hub • Book a table at C53, Boiler Room or Firefly",
    startDate: "Every match day",
  },
  {
    id: "alehouse-1",
    venueSlug: "alehouse",
    imageUrl: "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=600&q=80",
    title: "MEDIEVAL TAVERN NIGHTS",
    description: "Alehouse • Cocktails & late nights",
    startDate: "Fri–Sun",
  },
  {
    id: "c53-1",
    venueSlug: "c53",
    imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80",
    title: "LUNCH SPECIAL @ ₹127",
    description: "C53 World Cuisine • Eat & drink anything 12PM–7PM",
    startDate: "Mon–Sun",
  },
  {
    id: "kiik69-1",
    venueSlug: "kiik69",
    imageUrl: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&q=80",
    title: "SPORTS SCREENING + BOWLING",
    description: "KIIK 69 Sports Bar • Drinks & games",
  },
  {
    id: "boiler-room-1",
    venueSlug: "boiler-room",
    imageUrl: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=600&q=80",
    title: "UNDERGROUND CLUB VIBE",
    description: "Boiler Room • DJ nights • Late nights",
    startDate: "Thu–Sat",
  },
  {
    id: "firefly-1",
    venueSlug: "firefly",
    imageUrl: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=600&q=80",
    title: "CLUB NIGHTS & SOCIAL",
    description: "Firefly • Club nights • Social vibes",
    startDate: "Fri–Sun",
  },
  {
    id: "skyhy-1",
    venueSlug: "skyhy",
    imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80",
    title: "ROOFTOP LOUNGE",
    description: "SkyHy Live • City views • Rooftop vibes",
    startDate: "Mon–Sun",
  },
  {
    id: "club-rogue-gachibowli-1",
    venueSlug: "club-rogue-gachibowli",
    imageUrl: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=600&q=80",
    title: "CLUB NIGHTS",
    description: "Club Rogue Gachibowli • Signature cocktails",
    startDate: "Thu–Sat",
  },
  {
    id: "club-rogue-kondapur-1",
    venueSlug: "club-rogue-kondapur",
    imageUrl: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=600&q=80",
    title: "CLUB NIGHTS",
    description: "Club Rogue Kondapur • Signature cocktails",
    startDate: "Thu–Sat",
  },
  {
    id: "club-rogue-jubilee-hills-1",
    venueSlug: "club-rogue-jubilee-hills",
    imageUrl: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=600&q=80",
    title: "CLUB NIGHTS",
    description: "Club Rogue Jubilee Hills • Signature cocktails",
    startDate: "Thu–Sat",
  },
  {
    id: "sound-of-soul-1",
    venueSlug: "sound-of-soul",
    imageUrl: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=600&q=80",
    title: "CLUB NIGHTS & LIVE MUSIC",
    description: "Sound of Soul • Club nights • Live music",
    startDate: "Fri–Sun",
  },
  {
    id: "thezenzspot-1",
    venueSlug: "thezenzspot",
    imageUrl: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=600&q=80",
    title: "CLUB NIGHTS & PARTY",
    description: "The Zenz Spot • Club nights • Party vibes",
    startDate: "Thu–Sun",
  },
];

export function getOffersForVenue(venueSlug: string): VenueOffer[] {
  return VENUE_OFFERS.filter((o) => o.venueSlug === venueSlug);
}
