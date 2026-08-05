import type { PrismaClient } from "@prisma/client";
import {
  CHECKLIST_DEFAULT_OWNER_ID,
  DRIVE_CHECKLIST_KIND,
  DRIVE_HABIT_CHECKLIST_TITLE,
  DRIVE_HABIT_INSTRUCTIONS,
  DRIVE_HABIT_ITEM_TITLE,
} from "@/lib/team-checklist-templates";

const TZ = "Asia/Kolkata";

function todayKeyIst(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: TZ });
}

/**
 * Ensure a dedicated `drive` checklist for Amit (separate from habits / board-notes).
 * Also strips a Drive item accidentally attached to the habits notes row.
 */
export async function ensureDailyDriveHabit(
  prisma: PrismaClient,
  params: { ownerId?: string; createdBy: string }
): Promise<boolean> {
  const ownerId = params.ownerId ?? CHECKLIST_DEFAULT_OWNER_ID;
  let touched = false;

  // Clean up mistaken merge onto habits/board-notes row
  const habitsRow = await prisma.teamDailyChecklist.findFirst({
    where: { ownerId, kind: "habits", outletId: null },
    include: { items: true },
  });
  if (habitsRow) {
    const stray = habitsRow.items.filter((i) => i.title === DRIVE_HABIT_ITEM_TITLE);
    if (stray.length > 0) {
      await prisma.teamChecklistItem.deleteMany({
        where: { id: { in: stray.map((i) => i.id) } },
      });
      touched = true;
    }
  }

  let list = await prisma.teamDailyChecklist.findFirst({
    where: {
      ownerId,
      kind: DRIVE_CHECKLIST_KIND,
      outletId: null,
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  if (!list) {
    await prisma.teamDailyChecklist.create({
      data: {
        ownerId,
        kind: DRIVE_CHECKLIST_KIND,
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
            sortOrder: 0,
          },
        },
      },
    });
    return true;
  }

  if (list.title !== DRIVE_HABIT_CHECKLIST_TITLE) {
    await prisma.teamDailyChecklist.update({
      where: { id: list.id },
      data: { title: DRIVE_HABIT_CHECKLIST_TITLE },
    });
    touched = true;
  }

  const existing = list.items.find((i) => i.title === DRIVE_HABIT_ITEM_TITLE) ?? list.items[0];
  if (!existing) {
    await prisma.teamChecklistItem.create({
      data: {
        checklistId: list.id,
        title: DRIVE_HABIT_ITEM_TITLE,
        instructions: DRIVE_HABIT_INSTRUCTIONS,
        dayOfWeek: null,
        sortOrder: 0,
      },
    });
    return true;
  }

  if (
    existing.title !== DRIVE_HABIT_ITEM_TITLE ||
    existing.instructions !== DRIVE_HABIT_INSTRUCTIONS ||
    existing.dayOfWeek !== null
  ) {
    await prisma.teamChecklistItem.update({
      where: { id: existing.id },
      data: {
        title: DRIVE_HABIT_ITEM_TITLE,
        instructions: DRIVE_HABIT_INSTRUCTIONS,
        dayOfWeek: null,
      },
    });
    touched = true;
  }

  return touched;
}

export async function isAmitDriveHabitOpenToday(
  prisma: PrismaClient,
  dateKey = todayKeyIst()
): Promise<{ open: boolean; itemId: string | null }> {
  const list = await prisma.teamDailyChecklist.findFirst({
    where: {
      ownerId: CHECKLIST_DEFAULT_OWNER_ID,
      kind: DRIVE_CHECKLIST_KIND,
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
