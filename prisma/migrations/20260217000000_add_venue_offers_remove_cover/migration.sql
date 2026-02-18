-- CreateTable
CREATE TABLE "VenueOffer" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TEXT,
    "endDate" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VenueOffer_venueId_idx" ON "VenueOffer"("venueId");

-- AddForeignKey
ALTER TABLE "VenueOffer" ADD CONSTRAINT "VenueOffer_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing COVER images to VenueOffer (one per venue) - only if VenueImage exists and has COVER rows
INSERT INTO "VenueOffer" ("id", "venueId", "imageUrl", "title", "description", "active", "order", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  v.id,
  sub.url,
  'Today''s Highlight',
  'New offers dropping soon 👀✨',
  true,
  0,
  NOW(),
  NOW()
FROM "Venue" v
JOIN LATERAL (
  SELECT vi.url FROM "VenueImage" vi
  WHERE vi."venueId" = v.id AND vi.type = 'COVER'
  ORDER BY vi."order" ASC
  LIMIT 1
) sub ON true;

-- Remove COVER images (safe if none exist)
DELETE FROM "VenueImage" WHERE type = 'COVER';

-- Drop cover video column from Venue (safe if already dropped)
ALTER TABLE "Venue" DROP COLUMN IF EXISTS "coverVideoUrl";
