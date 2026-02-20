-- AlterTable: Add maxClaims and claimsUsed to DiscountLimit
ALTER TABLE "DiscountLimit" ADD COLUMN IF NOT EXISTS "maxClaims" INTEGER;
ALTER TABLE "DiscountLimit" ADD COLUMN IF NOT EXISTS "claimsUsed" INTEGER NOT NULL DEFAULT 0;
