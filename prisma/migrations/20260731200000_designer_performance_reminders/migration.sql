-- Designer WA nudge / performance reminder log
CREATE TABLE IF NOT EXISTS "TeamDesignerReminderLog" (
    "id" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "delivery" TEXT NOT NULL,
    "metaMessageId" TEXT,
    "shareUrl" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamDesignerReminderLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeamDesignerReminderLog_assigneeId_kind_dateKey_key"
  ON "TeamDesignerReminderLog"("assigneeId", "kind", "dateKey");

CREATE INDEX IF NOT EXISTS "TeamDesignerReminderLog_assigneeId_createdAt_idx"
  ON "TeamDesignerReminderLog"("assigneeId", "createdAt");

CREATE INDEX IF NOT EXISTS "TeamDesignerReminderLog_dateKey_idx"
  ON "TeamDesignerReminderLog"("dateKey");

CREATE INDEX IF NOT EXISTS "TeamDesignerReminderLog_createdAt_idx"
  ON "TeamDesignerReminderLog"("createdAt");
