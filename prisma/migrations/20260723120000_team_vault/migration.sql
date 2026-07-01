-- CreateTable
CREATE TABLE "TeamVaultEntry" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT,
    "username" TEXT,
    "passwordEnc" TEXT NOT NULL,
    "url" TEXT,
    "notes" TEXT,
    "outletId" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamVaultEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamVaultShare" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "sharedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamVaultShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamVaultEntry_ownerId_idx" ON "TeamVaultEntry"("ownerId");

-- CreateIndex
CREATE INDEX "TeamVaultEntry_outletId_idx" ON "TeamVaultEntry"("outletId");

-- CreateIndex
CREATE INDEX "TeamVaultEntry_category_idx" ON "TeamVaultEntry"("category");

-- CreateIndex
CREATE INDEX "TeamVaultEntry_createdAt_idx" ON "TeamVaultEntry"("createdAt");

-- CreateIndex
CREATE INDEX "TeamVaultShare_memberId_idx" ON "TeamVaultShare"("memberId");

-- CreateIndex
CREATE INDEX "TeamVaultShare_entryId_idx" ON "TeamVaultShare"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamVaultShare_entryId_memberId_key" ON "TeamVaultShare"("entryId", "memberId");

-- AddForeignKey
ALTER TABLE "TeamVaultShare" ADD CONSTRAINT "TeamVaultShare_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "TeamVaultEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
