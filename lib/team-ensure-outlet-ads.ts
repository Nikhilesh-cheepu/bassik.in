import type { PrismaClient } from "@prisma/client";
import {
  adsChecklistTitle,
  defaultWeeklyAdItems,
} from "@/lib/team-checklist-templates";

/** Ensure per-outlet weekly ads checklist (Mon–Sun) with editable descriptions. */
export async function ensureOutletWeeklyAds(
  prisma: PrismaClient,
  opts: { ownerId: string; outletId: string; outletLabel: string; createdBy: string }
) {
  const { ownerId, outletId, outletLabel, createdBy } = opts;
  const template = defaultWeeklyAdItems();

  let ads = await prisma.teamDailyChecklist.findFirst({
    where: { ownerId, kind: "ads", outletId },
    include: { items: true },
  });

  if (!ads) {
    return prisma.teamDailyChecklist.create({
      data: {
        ownerId,
        kind: "ads",
        title: adsChecklistTitle(outletLabel),
        outletId,
        createdBy,
        items: {
          create: template.map((t) => ({
            title: t.title,
            description: t.description ?? null,
            instructions: t.instructions,
            dayOfWeek: t.dayOfWeek,
            platforms: t.platforms,
            sortOrder: t.sortOrder,
          })),
        },
      },
      include: { items: true },
    });
  }

  const have = new Set(
    ads.items.map((i) => i.dayOfWeek).filter((d): d is string => Boolean(d))
  );
  let sortBase = Math.max(...ads.items.map((i) => i.sortOrder), -1);
  for (const t of template) {
    if (have.has(t.dayOfWeek)) continue;
    sortBase += 1;
    await prisma.teamChecklistItem.create({
      data: {
        checklistId: ads.id,
        title: t.title,
        description: t.description ?? null,
        instructions: t.instructions,
        dayOfWeek: t.dayOfWeek,
        platforms: t.platforms,
        sortOrder: sortBase,
      },
    });
  }

  return ads;
}
