-- Add all old booking discounts. Runs after initial seed.
-- Inserts additional discounts per venue (10% off, 50% off liquor, Lunch @127, etc.).

-- Kiik 69: 10% off on total bill
INSERT INTO "Discount" (id, "venueId", title, description, "limitPerDay", "startTime", "endTime", session, active, "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, v.id, '10% off on total bill', '10% discount on total bill', 50, NULL, NULL, NULL, true, NOW(), NOW()
FROM "Venue" v WHERE v."brandId" = 'kiik69';

-- Alehouse: 50% off on liquor
INSERT INTO "Discount" (id, "venueId", title, description, "limitPerDay", "startTime", "endTime", session, active, "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, v.id, '50% off on liquor', '50% discount on liquor', 30, NULL, NULL, NULL, true, NOW(), NOW()
FROM "Venue" v WHERE v."brandId" = 'alehouse';

-- C53: Lunch Special @ ₹127
INSERT INTO "Discount" (id, "venueId", title, description, "limitPerDay", "startTime", "endTime", session, active, "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, v.id, 'Lunch Special @ ₹127', 'Eat & drink anything 12PM–7PM', 20, '12:00', '19:00', 'LUNCH', true, NOW(), NOW()
FROM "Venue" v WHERE v."brandId" = 'c53';
