-- Designer can request reopen after DESIGN_DONE; admin must approve before edit/re-upload.
ALTER TABLE "TeamDesignerJob" ADD COLUMN IF NOT EXISTS "editRequestedAt" TIMESTAMP(3);
ALTER TABLE "TeamDesignerJob" ADD COLUMN IF NOT EXISTS "editRequestNote" TEXT;
