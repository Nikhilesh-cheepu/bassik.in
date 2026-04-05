-- Historical bookings may have stored client-supplied "Firely" in brandName
UPDATE "Reservation"
SET "brandName" = REPLACE("brandName", 'Firely', 'Firefly')
WHERE "brandId" = 'firefly' AND "brandName" LIKE '%Firely%';

UPDATE "Reservation"
SET "brandName" = REPLACE("brandName", 'firely', 'Firefly')
WHERE "brandId" = 'firefly' AND "brandName" LIKE '%firely%';
