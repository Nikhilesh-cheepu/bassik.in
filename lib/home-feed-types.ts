export type HomeFeedEvent = {
  id: string;
  imageUrl: string;
  title: string | null;
  description: string | null;
  eventDate: string | null;
  eventContinuous: boolean;
  entryLabel: string | null;
  capacityText: string | null;
  brandId: string;
  venueShortName: string;
  brandShortName: string;
  accentColor: string;
  logoPath: string;
};
