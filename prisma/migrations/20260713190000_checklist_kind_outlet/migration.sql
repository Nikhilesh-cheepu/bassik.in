-- AlterTable
ALTER TABLE "TeamDailyChecklist" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'stories';
ALTER TABLE "TeamDailyChecklist" ADD COLUMN IF NOT EXISTS "outletId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeamDailyChecklist_kind_idx" ON "TeamDailyChecklist"("kind");
CREATE INDEX IF NOT EXISTS "TeamDailyChecklist_outletId_idx" ON "TeamDailyChecklist"("outletId");

-- Unique: one stories checklist per owner+outlet; one posts/habits per owner (outletId null)
-- Postgres treats NULLs as distinct in unique constraints, so posts/habits need a partial unique.
DROP INDEX IF EXISTS "TeamDailyChecklist_ownerId_kind_outletId_key";
CREATE UNIQUE INDEX "TeamDailyChecklist_ownerId_kind_outletId_key"
  ON "TeamDailyChecklist"("ownerId", "kind", "outletId")
  WHERE "outletId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "TeamDailyChecklist_ownerId_kind_null_outlet_key"
  ON "TeamDailyChecklist"("ownerId", "kind")
  WHERE "outletId" IS NULL;
