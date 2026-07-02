-- Rename Kick69Purchase table to Kiik69Purchase
ALTER TABLE "Kick69Purchase" RENAME TO "Kiik69Purchase";

ALTER INDEX "Kick69Purchase_pkey" RENAME TO "Kiik69Purchase_pkey";
ALTER INDEX "Kick69Purchase_vendor_idx" RENAME TO "Kiik69Purchase_vendor_idx";
ALTER INDEX "Kick69Purchase_purchaseDate_idx" RENAME TO "Kiik69Purchase_purchaseDate_idx";
ALTER INDEX "Kick69Purchase_createdAt_idx" RENAME TO "Kiik69Purchase_createdAt_idx";
