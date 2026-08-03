import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

// Prefer public URL for local scripts (imports hoist past dotenv otherwise).
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
  const { getTodayKey } = await import("../lib/team-checklists");
  const {
    catchUpMetaFromStack,
    DESIGNER_DAILY_TARGET,
    naturalDesignerSortOrder,
    partitionOpenDesignerQueue,
    sortDesignerJobs,
  } = await import("../lib/team-designer-jobs-shared");
  const {
    loadDesignerEditMetaByIds,
    loadDesignerJobLinksByIds,
    toDesignerJobDto,
  } = await import("../lib/team-designer-jobs");
  const { computeAllDesignerPerformance } = await import(
    "../lib/team-designer-performance"
  );

  const today = getTodayKey();
  console.log(
    "today IST:",
    today,
    APPLY ? "(APPLY natural deadline order)" : "(dry-run)"
  );

  const perfs = await computeAllDesignerPerformance();
  for (const p of perfs) {
    const meta = catchUpMetaFromStack(p.stack);
    console.log("\n===", p.name, "===");
    console.log({
      countFrom: p.stack.countFrom,
      workDaysSoFar: p.stack.workDaysSoFar,
      targetSoFar: p.stack.targetSoFar,
      closedSoFar: p.stack.closedSoFar,
      deficitSoFar: p.stack.deficitSoFar,
      stackedBehind: p.stack.stackedBehind,
      catchUpSlots: meta.catchUpSlots,
      pendingFrom: meta.pendingFromLabel,
      missedDays: p.stack.missedDays,
      closedToday: p.closedToday,
      weekClosed: p.stack.weekClosed,
      weekTargetSoFar: p.stack.weekTargetSoFar,
    });

    const rows = await prisma.teamDesignerJob.findMany({
      where: {
        assigneeId: p.assigneeId,
        status: { in: ["READY_TO_DESIGN", "IN_PROGRESS", "PAUSED"] },
      },
    });
    const ids = rows.map((r) => r.id);
    const [linksMap, editMap] = await Promise.all([
      loadDesignerJobLinksByIds(ids),
      loadDesignerEditMetaByIds(ids),
    ]);
    const jobs = sortDesignerJobs(
      rows.map((r) =>
        toDesignerJobDto({
          ...r,
          links: linksMap.get(r.id) ?? [],
          editRequestedAt: editMap.get(r.id)?.editRequestedAt ?? null,
          editRequestNote: editMap.get(r.id)?.editRequestNote ?? null,
          pauseRequestedAt: editMap.get(r.id)?.pauseRequestedAt ?? null,
          pauseRequestNote: editMap.get(r.id)?.pauseRequestNote ?? null,
          catchUpExempt: editMap.get(r.id)?.catchUpExempt ?? false,
        })
      )
    );
    const released = jobs.filter((j) => j.catchUpExempt).length;
    const parts = partitionOpenDesignerQueue(jobs, DESIGNER_DAILY_TARGET, {
      catchUpSlots: meta.catchUpSlots,
      pendingFromLabel: meta.pendingFromLabel,
      releasedSlots: released,
    });
    console.log(
      "open:",
      jobs.length,
      "catchUp:",
      parts.catchUp.length,
      "today:",
      parts.todayPack.length,
      "later:",
      parts.upNext.length
    );
    console.log("TOP 14 (current sort):");
    for (let i = 0; i < Math.min(14, jobs.length); i++) {
      const j = jobs[i]!;
      const band = parts.catchUp.some((x) => x.id === j.id)
        ? "CATCH"
        : parts.todayPack.some((x) => x.id === j.id)
          ? "TODAY"
          : "LATER";
      console.log(
        String(i + 1).padStart(2),
        band.padEnd(5),
        j.status.slice(0, 10).padEnd(10),
        `due ${j.dueDate}`,
        `post ${j.postDate}`,
        j.outletLabel,
        j.title.slice(0, 36),
        `sort=${j.sortOrder}`
      );
    }

    if (APPLY) {
      const deadlineOrdered = [...jobs].sort((a, b) => {
        if (a.status === "IN_PROGRESS" && b.status !== "IN_PROGRESS") return -1;
        if (b.status === "IN_PROGRESS" && a.status !== "IN_PROGRESS") return 1;
        if (a.status === "PAUSED" && b.status !== "PAUSED") return -1;
        if (b.status === "PAUSED" && a.status !== "PAUSED") return 1;
        if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.postDate !== b.postDate) return a.postDate.localeCompare(b.postDate);
        if (a.outletId !== b.outletId) return a.outletId.localeCompare(b.outletId);
        return (a.title || "").localeCompare(b.title || "");
      });
      for (const j of deadlineOrdered) {
        const natural = naturalDesignerSortOrder(
          j.dueDate,
          j.outletId,
          j.format
        );
        await prisma.teamDesignerJob.update({
          where: { id: j.id },
          data: {
            sortOrder: natural,
            priorityMode: "NONE",
            urgent: false,
          },
        });
      }
      console.log(
        "Applied natural deadline sortOrder for",
        deadlineOrdered.length,
        "open jobs"
      );
    }
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
