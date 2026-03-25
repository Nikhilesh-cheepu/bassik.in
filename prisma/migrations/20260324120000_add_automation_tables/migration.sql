-- CreateTable
CREATE TABLE "AutomationImport" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "mapping" JSONB NOT NULL,
    "headers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationContact" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "fullName" TEXT,
    "phone" TEXT NOT NULL,
    "venue" TEXT,
    "extra" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationWhatsAppMessage" (
    "id" TEXT NOT NULL,
    "contactId" TEXT,
    "toPhone" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "providerSid" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationWhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomationImport_createdAt_idx" ON "AutomationImport"("createdAt");

-- CreateIndex
CREATE INDEX "AutomationContact_importId_idx" ON "AutomationContact"("importId");

-- CreateIndex
CREATE INDEX "AutomationContact_phone_idx" ON "AutomationContact"("phone");

-- CreateIndex
CREATE INDEX "AutomationWhatsAppMessage_contactId_idx" ON "AutomationWhatsAppMessage"("contactId");

-- CreateIndex
CREATE INDEX "AutomationWhatsAppMessage_createdAt_idx" ON "AutomationWhatsAppMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "AutomationContact" ADD CONSTRAINT "AutomationContact_importId_fkey" FOREIGN KEY ("importId") REFERENCES "AutomationImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationWhatsAppMessage" ADD CONSTRAINT "AutomationWhatsAppMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "AutomationContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
