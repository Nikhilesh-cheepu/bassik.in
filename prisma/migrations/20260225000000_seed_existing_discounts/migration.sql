-- Seed known discounts for venues that have zero discounts.
-- Preserves any existing Discount records; only inserts where none exist.
-- User can edit these in admin panel (slot limits, time window, enable/disable).

INSERT INTO "Discount" (id, "venueId", title, description, "limitPerDay", "startTime", "endTime", session, active, "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  v.id,
  'Eat & Drink @ ₹128',
  'Eat & drink anything @ ₹128',
  20,
  NULL,
  NULL,
  NULL,
  true,
  NOW(),
  NOW()
FROM "Venue" v
WHERE v."brandId" IN ('alehouse', 'kiik69', 'skyhy', 'c53', 'boiler-room', 'firefly', 'club-rogue-gachibowli', 'club-rogue-kondapur', 'club-rogue-jubilee-hills', 'sound-of-soul', 'thezenzspot', 'the-hub')
AND NOT EXISTS (SELECT 1 FROM "Discount" d WHERE d."venueId" = v.id);
