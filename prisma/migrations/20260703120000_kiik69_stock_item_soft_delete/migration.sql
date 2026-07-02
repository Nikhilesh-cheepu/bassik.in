-- Soft-delete stock items; movements stay for history until explicitly cleared.
ALTER TABLE "Kiik69StockItem" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Kiik69StockItem_deletedAt_idx" ON "Kiik69StockItem"("deletedAt");
