-- CreateTable
CREATE TABLE "TeamPersonalNote" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamPersonalNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamPersonalNote_ownerId_idx" ON "TeamPersonalNote"("ownerId");

-- CreateIndex
CREATE INDEX "TeamPersonalNote_createdAt_idx" ON "TeamPersonalNote"("createdAt");
