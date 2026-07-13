-- CreateTable
CREATE TABLE "TeamTodoItem" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TeamAdTaskStatus" NOT NULL DEFAULT 'TODO',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamTodoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamDailyChecklist" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamDailyChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamChecklistItem" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "dayOfWeek" TEXT,
    "platforms" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamChecklistCompletion" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "completedBy" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "completedPlatforms" JSONB,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamChecklistCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamTodoItem_ownerId_idx" ON "TeamTodoItem"("ownerId");

-- CreateIndex
CREATE INDEX "TeamTodoItem_status_idx" ON "TeamTodoItem"("status");

-- CreateIndex
CREATE INDEX "TeamTodoItem_createdAt_idx" ON "TeamTodoItem"("createdAt");

-- CreateIndex
CREATE INDEX "TeamDailyChecklist_ownerId_idx" ON "TeamDailyChecklist"("ownerId");

-- CreateIndex
CREATE INDEX "TeamDailyChecklist_sortOrder_idx" ON "TeamDailyChecklist"("sortOrder");

-- CreateIndex
CREATE INDEX "TeamDailyChecklist_createdAt_idx" ON "TeamDailyChecklist"("createdAt");

-- CreateIndex
CREATE INDEX "TeamChecklistItem_checklistId_idx" ON "TeamChecklistItem"("checklistId");

-- CreateIndex
CREATE INDEX "TeamChecklistItem_sortOrder_idx" ON "TeamChecklistItem"("sortOrder");

-- CreateIndex
CREATE INDEX "TeamChecklistCompletion_itemId_idx" ON "TeamChecklistCompletion"("itemId");

-- CreateIndex
CREATE INDEX "TeamChecklistCompletion_date_idx" ON "TeamChecklistCompletion"("date");

-- CreateIndex
CREATE INDEX "TeamChecklistCompletion_completedBy_idx" ON "TeamChecklistCompletion"("completedBy");

-- CreateIndex
CREATE UNIQUE INDEX "TeamChecklistCompletion_itemId_date_key" ON "TeamChecklistCompletion"("itemId", "date");

-- AddForeignKey
ALTER TABLE "TeamChecklistItem" ADD CONSTRAINT "TeamChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "TeamDailyChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamChecklistCompletion" ADD CONSTRAINT "TeamChecklistCompletion_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "TeamChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
