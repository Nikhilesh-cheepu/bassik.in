-- Fix display-name typo Firely → Firefly for firefly venue (if stored in DB)
UPDATE "Venue"
SET "shortName" = 'Firefly'
WHERE "brandId" = 'firefly' AND "shortName" = 'Firely';

UPDATE "Venue"
SET "name" = REPLACE("name", 'Firely', 'Firefly')
WHERE "brandId" = 'firefly' AND "name" LIKE '%Firely%';
