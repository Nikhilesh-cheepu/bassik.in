-- Designer-only performance attribution + priority interrupt mode
ALTER TABLE "TeamDesignerJob" ADD COLUMN IF NOT EXISTS "priorityMode" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "TeamDesignerJob" ADD COLUMN IF NOT EXISTS "startedByRole" TEXT;
ALTER TABLE "TeamDesignerJob" ADD COLUMN IF NOT EXISTS "closedByRole" TEXT;

CREATE INDEX IF NOT EXISTS "TeamDesignerJob_priorityMode_idx" ON "TeamDesignerJob"("priorityMode");
CREATE INDEX IF NOT EXISTS "TeamDesignerJob_closedByRole_idx" ON "TeamDesignerJob"("closedByRole");

-- Reminder log: allow per-job priority alerts same day
ALTER TABLE "TeamDesignerReminderLog" ADD COLUMN IF NOT EXISTS "jobId" TEXT NOT NULL DEFAULT '';

DROP INDEX IF EXISTS "TeamDesignerReminderLog_assigneeId_kind_dateKey_key";
CREATE UNIQUE INDEX IF NOT EXISTS "TeamDesignerReminderLog_assigneeId_kind_dateKey_jobId_key"
  ON "TeamDesignerReminderLog"("assigneeId", "kind", "dateKey", "jobId");

-- Backfill designer closes: upload at least ~2 min after start (designer wait gate).
-- Admin Mark done / instant closes stay NULL and do not count toward 4/day.
UPDATE "TeamDesignerJob"
SET "closedByRole" = 'designer',
    "startedByRole" = COALESCE("startedByRole", 'designer')
WHERE "status" = 'DESIGN_DONE'
  AND "startedAt" IS NOT NULL
  AND "uploadedAt" IS NOT NULL
  AND "closedByRole" IS NULL
  AND "fileUrl" IS NOT NULL
  AND EXTRACT(EPOCH FROM ("uploadedAt" - "startedAt")) >= 120;
