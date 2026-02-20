-- Seed Events & Offers for remaining outlets (boiler-room, firefly, skyhy, club-rogue, sound-of-soul, thezenzspot).
-- Only inserts when venue has zero offers.

INSERT INTO "VenueOffer" (id, "venueId", "imageUrl", "endDate", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  v.id,
  CASE v."brandId"
    WHEN 'boiler-room' THEN 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=600&q=80'
    WHEN 'firefly' THEN 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=600&q=80'
    WHEN 'skyhy' THEN 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80'
    WHEN 'club-rogue-gachibowli' THEN 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=600&q=80'
    WHEN 'club-rogue-kondapur' THEN 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=600&q=80'
    WHEN 'club-rogue-jubilee-hills' THEN 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=600&q=80'
    WHEN 'sound-of-soul' THEN 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=600&q=80'
    WHEN 'thezenzspot' THEN 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=600&q=80'
    ELSE NULL
  END,
  NULL,
  NOW(),
  NOW()
FROM "Venue" v
WHERE v."brandId" IN ('boiler-room', 'firefly', 'skyhy', 'club-rogue-gachibowli', 'club-rogue-kondapur', 'club-rogue-jubilee-hills', 'sound-of-soul', 'thezenzspot')
AND NOT EXISTS (SELECT 1 FROM "VenueOffer" o WHERE o."venueId" = v.id);
