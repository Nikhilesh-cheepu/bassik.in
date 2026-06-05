-- CreateTable
CREATE TABLE "VenueChatConfig" (
    "brandId" TEXT NOT NULL,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "hostName" TEXT,
    "playbook" TEXT,
    "learnedExamples" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueChatConfig_pkey" PRIMARY KEY ("brandId")
);
