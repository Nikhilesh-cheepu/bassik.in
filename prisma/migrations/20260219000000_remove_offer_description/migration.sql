-- AlterTable: Remove description from VenueOffer (offers are image-only now)
ALTER TABLE "VenueOffer" DROP COLUMN IF EXISTS "description";
