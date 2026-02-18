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
];

export function getOffersForVenue(venueSlug: string): VenueOffer[] {
  return VENUE_OFFERS.filter((o) => o.venueSlug === venueSlug);
}
