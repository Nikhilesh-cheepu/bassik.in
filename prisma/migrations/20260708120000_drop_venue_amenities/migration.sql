-- Remove per-venue amenities (section removed from product).

ALTER TABLE "Venue" DROP COLUMN IF EXISTS "amenities";
