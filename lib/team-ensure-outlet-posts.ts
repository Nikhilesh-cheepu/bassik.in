import type { PrismaClient } from "@prisma/client";
import {
  defaultWeekendPostItems,
  outletPostsChecklistTitle,
} from "@/lib/team-checklist-templates";

/** Ensure per-outlet posts checklist has Fri / Sat / Sun recurring items. */
export async function ensureOutletWeekendPosts(
  prisma: PrismaClient,
  opts: { ownerId: string; outletId: string; outletLabel: string; createdBy: string }
) {
  const { ownerId, outletId, outletLabel, createdBy } = opts;
  const template = defaultWeekendPostItems();

  let posts = await prisma.teamDailyChecklist.findFirst({
    where: { ownerId, kind: "posts", outletId },
    include: { items: true },
  });

  if (!posts) {
    posts = await prisma.teamDailyChecklist.create({
      data: {
        ownerId,
        kind: "posts",
        title: outletPostsChecklistTitle(outletLabel),
        outletId,
        createdBy,
        items: {
          create: template.map((t) => ({
            title: t.title,
            instructions: t.instructions,
            dayOfWeek: t.dayOfWeek,
            platforms: t.platforms,
            sortOrder: t.sortOrder,
          })),
        },
      },
      include: { items: true },
    });
    return posts;
  }

  const have = new Set(
    posts.items.map((i) => i.dayOfWeek).filter((d): d is string => Boolean(d))
  );
  let sortBase = Math.max(...posts.items.map((i) => i.sortOrder), -1);
  for (const t of template) {
    if (have.has(t.dayOfWeek)) continue;
    sortBase += 1;
    await prisma.teamChecklistItem.create({
      data: {
        checklistId: posts.id,
        title: t.title,
        instructions: t.instructions,
        dayOfWeek: t.dayOfWeek,
        platforms: t.platforms,
        sortOrder: sortBase,
      },
    });
  }

  return posts;
}
