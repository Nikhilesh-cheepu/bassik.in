import type { PrismaClient } from "@prisma/client";
import {
  CHECKLIST_DEFAULT_OWNER_ID,
  DRIVE_HABIT_INSTRUCTIONS,
  DRIVE_HABIT_ITEM_TITLE,
} from "@/lib/team-checklist-templates";
import {
  BOARD_NOTES_CHECKLIST_TITLE,
  serializeBoardNotes,
} from "@/lib/team-checklists";

const TZ = "Asia/Kolkata";

function todayKeyIst(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: TZ });
}

/**
 * Ensure Amit’s board-notes habits checklist has the compulsory Drive item.
 * (DB allows only one null-outlet habits list per owner — share that row.)
 */
export async function ensureDailyDriveHabit(
  prisma: PrismaClient,
  params: { ownerId?: string; createdBy: string }
): Promise<boolean> {
  const ownerId = params.ownerId ?? CHECKLIST_DEFAULT_OWNER_ID;

  let list = await prisma.teamDailyChecklist.findFirst({
    where: {
      ownerId,
      kind: "habits",
      outletId: null,
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  let touched = false;

  if (!list) {
    list = await prisma.teamDailyChecklist.create({
      data: {
        ownerId,
        kind: "habits",
        title: BOARD_NOTES_CHECKLIST_TITLE,
        description: serializeBoardNotes({ postings: "", ads: "", driveFolderUrl: "" }),
        outletId: null,
        createdBy: params.createdBy,
        sortOrder: 0,
        items: {
          create: {
            title: DRIVE_HABIT_ITEM_TITLE,
            instructions: DRIVE_HABIT_INSTRUCTIONS,
            dayOfWeek: null,
            sortOrder: 0,
          },
        },
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    return true;
  }

  // Prefer canonical notes title so board-notes + Drive share one row
  if (list.title !== BOARD_NOTES_CHECKLIST_TITLE) {
    const looksLikeJson = Boolean(list.description?.trim().startsWith("{"));
    list = await prisma.teamDailyChecklist.update({
      where: { id: list.id },
      data: {
        title: BOARD_NOTES_CHECKLIST_TITLE,
        description: looksLikeJson
          ? list.description
          : serializeBoardNotes({ postings: "", ads: "", driveFolderUrl: "" }),
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    touched = true;
  }

  const existing = list.items.find((i) => i.title === DRIVE_HABIT_ITEM_TITLE);
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

  if (existing.instructions !== DRIVE_HABIT_INSTRUCTIONS || existing.dayOfWeek !== null) {
    await prisma.teamChecklistItem.update({
      where: { id: existing.id },
      data: {
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
      kind: "habits",
      outletId: null,
    },
    include: {
      items: {
        where: { title: DRIVE_HABIT_ITEM_TITLE },
        take: 1,
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
