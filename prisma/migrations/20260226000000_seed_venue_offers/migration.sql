-- Seed old static offers for venues that have zero offers.
-- User page will show these; admin can edit them in Events & Offers tab.

INSERT INTO "VenueOffer" (id, "venueId", "imageUrl", "endDate", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  v.id,
  CASE v."brandId"
    WHEN 'the-hub' THEN 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80'
    WHEN 'alehouse' THEN 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=600&q=80'
    WHEN 'c53' THEN 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80'
    WHEN 'kiik69' THEN 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&q=80'
    ELSE NULL
  END,
  NULL,
  NOW(),
  NOW()
FROM "Venue" v
WHERE v."brandId" IN ('the-hub', 'alehouse', 'c53', 'kiik69')
AND NOT EXISTS (SELECT 1 FROM "VenueOffer" o WHERE o."venueId" = v.id);
