-- VenueOffer: remove title, description, active, startDate, order (ultra-minimal: imageUrl + optional endDate only)
ALTER TABLE "VenueOffer" DROP COLUMN IF EXISTS "title";
ALTER TABLE "VenueOffer" DROP COLUMN IF EXISTS "description";
ALTER TABLE "VenueOffer" DROP COLUMN IF EXISTS "active";
ALTER TABLE "VenueOffer" DROP COLUMN IF EXISTS "startDate";
ALTER TABLE "VenueOffer" DROP COLUMN IF EXISTS "order";
