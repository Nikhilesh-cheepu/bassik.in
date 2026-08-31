#!/usr/bin/env node
/**
 * Maintenance reset: clear designer queue + disable all daily checklist outlets.
 *
 * Usage:
 *   node scripts/reset-team-maintenance.ts          # dry-run counts
 *   node scripts/reset-team-maintenance.ts --apply    # execute
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

if (
  process.env.DATABASE_PUBLIC_URL?.trim() &&
  (!process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_URL.includes("railway.internal"))
) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL.trim();
}

const APPLY = process.argv.includes("--apply");

async function main() {
  const { prisma } = await import("../lib/db");
  const { CHECKLIST_DEFAULT_OWNER_ID } = await import("../lib/team-checklist-templates");
  const { TEAM_AD_OUTLETS } = await import("../lib/team-outlets");

  const openJobs = await prisma.teamDesignerJob.count({
    where: { status: { not: "DESIGN_DONE" } },
  });
  const doneJobs = await prisma.teamDesignerJob.count({
    where: { status: "DESIGN_DONE" },
  });
  const outletChecklists = await prisma.teamDailyChecklist.count({
    where: {
      outletId: { not: null },
      kind: { in: ["stories", "posts", "ads"] },
    },
  });
  const reminders = await prisma.teamDesignerReminderLog.count();

  console.log("=== Team maintenance reset (dry-run) ===");
  console.log({
    openDesignerJobs: openJobs,
    doneDesignerJobs: doneJobs,
    outletChecklists,
    reminderLogs: reminders,
    defaultOwner: CHECKLIST_DEFAULT_OWNER_ID,
    knownOutlets: TEAM_AD_OUTLETS.length,
    apply: APPLY,
  });

  if (!APPLY) {
    console.log("\nRe-run with --apply to execute.");
    await prisma.$disconnect();
    return;
  }

  const deletedJobs = await prisma.teamDesignerJob.deleteMany({});
  const deletedReminders = await prisma.teamDesignerReminderLog.deleteMany({});
  const deletedChecklists = await prisma.teamDailyChecklist.deleteMany({
    where: {
      outletId: { not: null },
      kind: { in: ["stories", "posts", "ads"] },
    },
  });

  console.log("\n=== Applied ===");
  console.log({
    deletedDesignerJobs: deletedJobs.count,
    deletedReminderLogs: deletedReminders.count,
    deletedOutletChecklists: deletedChecklists.count,
  });
  console.log(
    "\nDesigner queue is frozen by default. Set TEAM_DESIGNER_QUEUE_FROZEN=0 when re-seeding."
  );

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
