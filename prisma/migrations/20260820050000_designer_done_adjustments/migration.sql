-- Admin manual +/- done credits (adjust day strip & catch-up without tasks)

CREATE TABLE "TeamDesignerDoneAdjustment" (
    "id" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "creditDate" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "note" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamDesignerDoneAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeamDesignerDoneAdjustment_assigneeId_creditDate_idx" ON "TeamDesignerDoneAdjustment"("assigneeId", "creditDate");
CREATE INDEX "TeamDesignerDoneAdjustment_creditDate_idx" ON "TeamDesignerDoneAdjustment"("creditDate");
