-- Manual priority order for Monthly designer queue (admin drag).
ALTER TABLE "TeamDesignerJob" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "TeamDesignerJob_sortOrder_idx" ON "TeamDesignerJob"("sortOrder");

-- Clear seed boilerplate briefs like "Komma Saturday Post — send to Mahesh"
UPDATE "TeamDesignerJob"
SET "description" = NULL
WHERE "description" IS NOT NULL
  AND (
    "description" ILIKE '%— send to %'
    OR "description" ILIKE '%- send to %'
    OR "description" ILIKE '%send to Mahesh%'
    OR "description" ILIKE '%send to Jeslyn%'
  );
