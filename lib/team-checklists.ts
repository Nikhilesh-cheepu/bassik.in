import type {
  TeamDailyChecklist,
  TeamChecklistItem,
  TeamChecklistCompletion,
} from "@prisma/client";

export type TeamChecklistItemDto = {
  id: string;
  title: string;
  description: string | null;
  dayOfWeek: string | null;
  sortOrder: number;
  completedToday: boolean;
};

export type TeamDailyChecklistDto = {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  items: TeamChecklistItemDto[];
  createdAt: string;
  updatedAt: string;
};

export function getTodayKey(): string {
  const TZ = "Asia/Kolkata";
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

export function getDayOfWeek(): string {
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return days[new Date().getDay()] ?? "mon";
}

export function toTeamChecklistItemDto(
  item: TeamChecklistItem & { completions: TeamChecklistCompletion[] },
  today: string
): TeamChecklistItemDto {
  const completedToday = item.completions.some((c) => c.date === today);
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    dayOfWeek: item.dayOfWeek,
    sortOrder: item.sortOrder,
    completedToday,
  };
}

export function toTeamDailyChecklistDto(
  checklist: TeamDailyChecklist & {
    items: (TeamChecklistItem & { completions: TeamChecklistCompletion[] })[];
  },
  today: string
): TeamDailyChecklistDto {
  const todayDay = getDayOfWeek();
  
  const filteredItems = checklist.items
    .filter((item) => !item.dayOfWeek || item.dayOfWeek === todayDay)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    id: checklist.id,
    title: checklist.title,
    description: checklist.description,
    sortOrder: checklist.sortOrder,
    items: filteredItems.map((item) => toTeamChecklistItemDto(item, today)),
    createdAt: checklist.createdAt.toISOString(),
    updatedAt: checklist.updatedAt.toISOString(),
  };
}

export function sortTeamChecklists<
  T extends { sortOrder: number; createdAt: Date }
>(checklists: T[]): T[] {
  return [...checklists].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}
