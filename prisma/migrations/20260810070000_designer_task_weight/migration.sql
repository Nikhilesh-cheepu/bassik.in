-- Task weight 1–4: closing a weight-4 job counts as 4 toward daily / home strip
ALTER TABLE "TeamDesignerJob" ADD COLUMN IF NOT EXISTS "taskWeight" INTEGER NOT NULL DEFAULT 1;
