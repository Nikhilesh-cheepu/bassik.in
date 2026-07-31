/**
 * Ensure Sat/Sun weekend posts for Mahesh exist and are READY_TO_DESIGN
 * with dueDate bumped so they show in the Open queue.
 *
 * Usage: npx tsx scripts/seed-sat-sun-mahesh.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const DATES = ["2026-08-01", "2026-08-02"] as const; // Sat, Sun
const TODAY = "2026-07-31";

const DAY_LABEL: Record<string, string> = {
  "2026-08-01": "Saturday",
  "2026-08-02": "Sunday",
};

async function main() {
  const { prisma } = await import("../lib/db");
  const { teamOutletLabel } = await import("../lib/team-outlets");
  const {
    DESIGNER_ASSIGNEE_WEEKEND,
    DESIGNER_MONTH_OUTLET_IDS,
    DESIGNER_UPLOAD_DUE_TIME,
  } = await import("../lib/team-designer-jobs-shared");
  const { monthKeyFromYmd } = await import("../lib/team-designer-jobs");

  const results: Array<{ postDate: string; outletId: string; action: string; id: string }> =
    [];

  for (const postDate of DATES) {
    for (const outletId of DESIGNER_MONTH_OUTLET_IDS) {
      const title = `${teamOutletLabel(outletId)} ${DAY_LABEL[postDate]} Post`;
      const existing = await prisma.teamDesignerJob.findFirst({
        where: {
          postDate,
          outletId,
          lane: "WEEKEND",
          format: "post",
          assigneeId: DESIGNER_ASSIGNEE_WEEKEND,
        },
      });

      if (existing) {
        const updated = await prisma.teamDesignerJob.update({
          where: { id: existing.id },
          data: {
            status: "READY_TO_DESIGN",
            dueDate: TODAY,
            dueTime: DESIGNER_UPLOAD_DUE_TIME,
            startedAt: null,
            ...(existing.fileUrl
              ? {}
              : {
                  fileUrl: null,
                  uploadedAt: null,
                  waApproved: false,
                }),
            title,
            description: existing.description ?? null,
          },
        });
        results.push({
          postDate,
          outletId,
          action: existing.status === "READY_TO_DESIGN" ? "refreshed" : `from ${existing.status}`,
          id: updated.id,
        });
      } else {
        const created = await prisma.teamDesignerJob.create({
          data: {
            monthKey: monthKeyFromYmd(postDate),
            postDate,
            dueDate: TODAY,
            dueTime: DESIGNER_UPLOAD_DUE_TIME,
            outletId,
            lane: "WEEKEND",
            format: "post",
            title,
            description: null,
            assigneeId: DESIGNER_ASSIGNEE_WEEKEND,
            status: "READY_TO_DESIGN",
            createdBy: "admin",
          },
        });
        results.push({ postDate, outletId, action: "created", id: created.id });
      }
    }
  }

  console.log(JSON.stringify({ ok: true, count: results.length, results }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
