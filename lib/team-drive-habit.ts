import type { PrismaClient } from "@prisma/client";
import {
  CHECKLIST_DEFAULT_OWNER_ID,
  DRIVE_HABIT_CHECKLIST_TITLE,
  DRIVE_HABIT_INSTRUCTIONS,
  DRIVE_HABIT_ITEM_TITLE,
} from "@/lib/team-checklist-templates";

const TZ = "Asia/Kolkata";

function todayKeyIst(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Ensure Amit has the daily Drive checklist + single compulsory item. */
export async function ensureDailyDriveHabit(
  prisma: PrismaClient,
  params: { ownerId?: string; createdBy: string }
): Promise<boolean> {
  const ownerId = params.ownerId ?? CHECKLIST_DEFAULT_OWNER_ID;
  let list = await prisma.teamDailyChecklist.findFirst({
    where: {
      ownerId,
      kind: "habits",
      title: DRIVE_HABIT_CHECKLIST_TITLE,
      outletId: null,
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  let created = false;
  if (!list) {
    list = await prisma.teamDailyChecklist.create({
      data: {
        ownerId,
        kind: "habits",
        title: DRIVE_HABIT_CHECKLIST_TITLE,
        description: "Compulsory daily Drive photo check for posting.",
        outletId: null,
        createdBy: params.createdBy,
        sortOrder: -10,
        items: {
          create: {
            title: DRIVE_HABIT_ITEM_TITLE,
            instructions: DRIVE_HABIT_INSTRUCTIONS,
            dayOfWeek: null,
            platforms: [],
            sortOrder: 0,
          },
        },
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    created = true;
  } else if (list.items.length === 0) {
    await prisma.teamChecklistItem.create({
      data: {
        checklistId: list.id,
        title: DRIVE_HABIT_ITEM_TITLE,
        instructions: DRIVE_HABIT_INSTRUCTIONS,
        dayOfWeek: null,
        platforms: [],
        sortOrder: 0,
      },
    });
    created = true;
  } else {
    const item = list.items[0]!;
    if (item.title !== DRIVE_HABIT_ITEM_TITLE || item.instructions !== DRIVE_HABIT_INSTRUCTIONS) {
      await prisma.teamChecklistItem.update({
        where: { id: item.id },
        data: {
          title: DRIVE_HABIT_ITEM_TITLE,
          instructions: DRIVE_HABIT_INSTRUCTIONS,
          dayOfWeek: null,
        },
      });
    }
  }

  return created;
}

export async function isAmitDriveHabitOpenToday(
  prisma: PrismaClient,
  dateKey = todayKeyIst()
): Promise<{ open: boolean; itemId: string | null }> {
  const list = await prisma.teamDailyChecklist.findFirst({
    where: {
      ownerId: CHECKLIST_DEFAULT_OWNER_ID,
      kind: "habits",
      title: DRIVE_HABIT_CHECKLIST_TITLE,
      outletId: null,
    },
    include: {
      items: {
        take: 1,
        orderBy: { sortOrder: "asc" },
        include: {
          completions: { where: { date: dateKey }, take: 1 },
        },
      },
    },
  });
  const item = list?.items[0] ?? null;
  if (!item) return { open: true, itemId: null };
  return { open: item.completions.length === 0, itemId: item.id };
}
