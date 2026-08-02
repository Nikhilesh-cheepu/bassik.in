-- Admin can move an overdue job out of Catch up into the normal Open list.
ALTER TABLE "TeamDesignerJob" ADD COLUMN IF NOT EXISTS "catchUpExempt" BOOLEAN NOT NULL DEFAULT false;
