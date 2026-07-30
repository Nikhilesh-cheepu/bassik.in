import { prisma } from "@/lib/db";
import {
  addDaysYmd,
  dayIdForYmd,
  getTodayKey,
  isWeekendPostDayId,
  mondayOfWeekContaining,
  previousDayYmd,
} from "@/lib/team-checklists";
import { CHECKLIST_DAY_IDS, SOCIAL_BOARD_PLATFORMS } from "@/lib/team-checklist-templates";

/**
 * Mark stories + posts done for go-live dates on or before `cutoffYmd`.
 * Skips ads. Used to clear Amit's old backlog while leaving ads open.
 */
export async function closeChecklistBacklogExceptAds(params: {
  ownerId: string;
  /** Inclusive — typically today − 2 days */
  cutoffYmd: string;
  completedBy: string;
}): Promise<{ closed: number; cutoffYmd: string }> {
  const cutoff = params.cutoffYmd;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cutoff)) {
    throw new Error("Invalid cutoffYmd");
  }

  const checklists = await prisma.teamDailyChecklist.findMany({
    where: {
      ownerId: params.ownerId,
      kind: { in: ["stories", "posts"] },
    },
    include: { items: { include: { completions: true } } },
  });

  let closed = 0;
  const today = getTodayKey();
  const monday = mondayOfWeekContaining(today);
  const weekMondays = [monday, addDaysYmd(monday, -7), addDaysYmd(monday, -14)];

  for (const list of checklists) {
    for (const item of list.items) {
      const targets = new Set<string>();

      if (list.kind === "stories" && item.dayOfWeek) {
        for (const weekMon of weekMondays) {
          const idx = CHECKLIST_DAY_IDS.indexOf(
            item.dayOfWeek as (typeof CHECKLIST_DAY_IDS)[number]
          );
          if (idx < 0) continue;
          const target = addDaysYmd(weekMon, idx);
          if (target <= cutoff) targets.add(target);
        }
        // Also cover due-yesterday / due-today story targets via previous day chain
        for (let i = 0; i <= 14; i++) {
          const due = addDaysYmd(today, -i);
          const target = addDaysYmd(due, 1);
          if (dayIdForYmd(target) === item.dayOfWeek && target <= cutoff) {
            targets.add(target);
          }
        }
      }

      if (list.kind === "posts" && item.dayOfWeek && isWeekendPostDayId(item.dayOfWeek)) {
        for (const weekMon of weekMondays) {
          const idx = CHECKLIST_DAY_IDS.indexOf(item.dayOfWeek);
          if (idx < 0) continue;
          const target = addDaysYmd(weekMon, idx);
          if (target <= cutoff) targets.add(target);
        }
      }

      // One-shot posts with no day — if created earlier, close once
      if (list.kind === "posts" && !item.dayOfWeek) {
        const already = item.completions.length > 0;
        if (!already) {
          await prisma.teamChecklistCompletion.create({
            data: {
              itemId: item.id,
              completedBy: params.completedBy,
              date: previousDayYmd(today),
              completedPlatforms: [...SOCIAL_BOARD_PLATFORMS],
            },
          });
          closed += 1;
        }
        continue;
      }

      for (const target of targets) {
        const has = item.completions.some((c) => c.date === target);
        if (has) continue;
        await prisma.teamChecklistCompletion.create({
          data: {
            itemId: item.id,
            completedBy: params.completedBy,
            date: target,
            completedPlatforms: [...SOCIAL_BOARD_PLATFORMS],
          },
        });
        closed += 1;
      }
    }
  }

  return { closed, cutoffYmd: cutoff };
}
