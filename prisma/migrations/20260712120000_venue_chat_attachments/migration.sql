-- CreateTable
CREATE TABLE "VenueChatAttachment" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "blobPathname" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueChatAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VenueChatAttachment_expiresAt_idx" ON "VenueChatAttachment"("expiresAt");

-- CreateIndex
CREATE INDEX "VenueChatAttachment_leadId_idx" ON "VenueChatAttachment"("leadId");

-- AddForeignKey
ALTER TABLE "VenueChatAttachment" ADD CONSTRAINT "VenueChatAttachment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "VenueChatLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
