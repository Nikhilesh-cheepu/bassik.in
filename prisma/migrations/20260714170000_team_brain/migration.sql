-- CreateTable
CREATE TABLE IF NOT EXISTS "TeamBrainItem" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "done" BOOLEAN NOT NULL DEFAULT false,
    "remindOn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamBrainItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeamBrainItem_ownerId_kind_idx" ON "TeamBrainItem"("ownerId", "kind");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeamBrainItem_ownerId_done_idx" ON "TeamBrainItem"("ownerId", "done");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeamBrainItem_ownerId_remindOn_idx" ON "TeamBrainItem"("ownerId", "remindOn");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeamBrainItem_createdAt_idx" ON "TeamBrainItem"("createdAt");
