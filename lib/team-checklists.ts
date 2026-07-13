import type {
  TeamDailyChecklist,
  TeamChecklistItem,
  TeamChecklistCompletion,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import {
  CHECKLIST_DAY_IDS,
  CHECKLIST_DAY_LABELS,
  CHECKLIST_DEFAULT_OWNER_ID,
  SOCIAL_BOARD_PLATFORMS,
  type ChecklistDayId,
  type ChecklistKind,
} from "@/lib/team-checklist-templates";

export {
  CHECKLIST_DAY_IDS,
  CHECKLIST_DAY_LABELS,
  CHECKLIST_DEFAULT_OWNER_ID,
  SOCIAL_BOARD_PLATFORMS,
  type ChecklistDayId,
  type ChecklistKind,
};

export const CHECKLIST_PLATFORM_IDS = SOCIAL_BOARD_PLATFORMS;

export type ChecklistPlatformId = (typeof CHECKLIST_PLATFORM_IDS)[number];

export const CHECKLIST_PLATFORM_LABELS: Record<ChecklistPlatformId, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
};

const TZ = "Asia/Kolkata";
const OVERDUE_LOOKBACK_DAYS = 14;

export type TeamChecklistCompletionDto = {
  date: string;
  completedPlatforms: string[];
  markedComplete: boolean;
};

export type TeamChecklistItemDto = {
  id: string;
  checklistId: string;
  title: string;
  description: string | null;
  instructions: string | null;
  dayOfWeek: string | null;
  platforms: string[];
  sortOrder: number;
  completionsByDate: Record<string, TeamChecklistCompletionDto>;
  completedToday: boolean;
  completedPlatformsToday: string[];
  /** Story target date or habit/post date this row is about */
  targetDate?: string;
  dueLabel?: string;
  isOverdue?: boolean;
  outletId?: string | null;
  outletTitle?: string;
  kind?: ChecklistKind;
};

export type TeamDailyChecklistDto = {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  kind: ChecklistKind;
  outletId: string | null;
  sortOrder: number;
  items: TeamChecklistItemDto[];
  createdAt: string;
  updatedAt: string;
};

export type BoardDayMeta = {
  focusDate: string;
  today: string;
  yesterday: string;
  tomorrow: string;
  focusDayId: ChecklistDayId;
  label: string;
};

export type ChecklistBoardDto = {
  day: BoardDayMeta;
  enabledOutletIds: string[];
  overdueStories: TeamChecklistItemDto[];
  focusStories: TeamChecklistItemDto[];
  habit: TeamChecklistItemDto | null;
  openPosts: TeamChecklistItemDto[];
  checklists: TeamDailyChecklistDto[];
};

export function getTodayKey(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: TZ });
}

export function getDayOfWeekIst(now = new Date()): ChecklistDayId {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  })
    .format(now)
    .toLowerCase();
  const map: Record<string, ChecklistDayId> = {
    mon: "mon",
    tue: "tue",
    wed: "wed",
    thu: "thu",
    fri: "fri",
    sat: "sat",
    sun: "sun",
  };
  return map[weekday.slice(0, 3)] ?? "mon";
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0));
}

function formatYmdUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDaysYmd(ymd: string, delta: number): string {
  const d = parseYmd(ymd);
  d.setUTCDate(d.getUTCDate() + delta);
  return formatYmdUtc(d);
}

export function dayIdForYmd(ymd: string): ChecklistDayId {
  const d = parseYmd(ymd);
  const dow = d.getUTCDay();
  const map: ChecklistDayId[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return map[dow]!;
}

/** Previous calendar day (for story due date). */
export function previousDayYmd(ymd: string): string {
  return addDaysYmd(ymd, -1);
}

/** Story for `targetDate` is due at 22:00 IST on the previous calendar day. */
export function storyDueAtMs(targetDateYmd: string): number {
  const dueDay = previousDayYmd(targetDateYmd);
  const [y, m, d] = dueDay.split("-").map(Number);
  // 22:00 IST = 16:30 UTC
  return Date.UTC(y!, m! - 1, d!, 16, 30, 0);
}

export function storyDueLabel(targetDateYmd: string): string {
  const dueDay = previousDayYmd(targetDateYmd);
  const dueDayId = dayIdForYmd(dueDay);
  const targetDayId = dayIdForYmd(targetDateYmd);
  return `${CHECKLIST_DAY_LABELS[targetDayId]} story · due ${CHECKLIST_DAY_LABELS[dueDayId]} 10 PM`;
}

export function isStoryOverdue(targetDateYmd: string, now = new Date()): boolean {
  return now.getTime() > storyDueAtMs(targetDateYmd);
}

export function buildBoardDayMeta(focusDate: string, now = new Date()): BoardDayMeta {
  const today = getTodayKey(now);
  return {
    focusDate,
    today,
    yesterday: addDaysYmd(today, -1),
    tomorrow: addDaysYmd(today, 1),
    focusDayId: dayIdForYmd(focusDate),
    label:
      focusDate === today
        ? "Today"
        : focusDate === addDaysYmd(today, -1)
          ? "Yesterday"
          : focusDate === addDaysYmd(today, 1)
            ? "Tomorrow"
            : focusDate,
  };
}

export function lookbackDateKeys(focusDate: string, days = OVERDUE_LOOKBACK_DAYS): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= days; i++) {
    keys.push(addDaysYmd(focusDate, -i));
  }
  return keys;
}

export function boardDateWindow(focusDate: string): string[] {
  const today = focusDate;
  const keys = new Set<string>();
  keys.add(today);
  keys.add(addDaysYmd(today, -1));
  keys.add(addDaysYmd(today, 1));
  for (const k of lookbackDateKeys(today)) keys.add(k);
  // also include next 7 days for early story targets mapped from dayOfWeek
  for (let i = 0; i < 7; i++) keys.add(addDaysYmd(today, i));
  for (let i = 1; i <= 7; i++) keys.add(addDaysYmd(today, -i));
  return [...keys];
}

/** Map a recurring dayOfWeek onto the calendar week containing focusDate. */
export function targetDateForDayOfWeek(dayOfWeek: ChecklistDayId, focusDate: string): string {
  const focusDay = dayIdForYmd(focusDate);
  const focusIdx = CHECKLIST_DAY_IDS.indexOf(focusDay);
  const wantIdx = CHECKLIST_DAY_IDS.indexOf(dayOfWeek);
  const delta = wantIdx - focusIdx;
  return addDaysYmd(focusDate, delta);
}

export function isChecklistDayId(v: string): v is ChecklistDayId {
  return (CHECKLIST_DAY_IDS as readonly string[]).includes(v);
}

export function isChecklistPlatformId(v: string): v is ChecklistPlatformId {
  return (CHECKLIST_PLATFORM_IDS as readonly string[]).includes(v);
}

export function isChecklistKind(v: string): v is ChecklistKind {
  return v === "stories" || v === "posts" || v === "habits";
}

export function parsePlatforms(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const id = item.trim().toLowerCase();
    if (!isChecklistPlatformId(id) && id !== "instagram" && id !== "youtube") {
      // only allow board platforms
      if (!(SOCIAL_BOARD_PLATFORMS as readonly string[]).includes(id)) continue;
    }
    if (!(SOCIAL_BOARD_PLATFORMS as readonly string[]).includes(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function platformsFromJson(raw: Prisma.JsonValue | null | undefined): string[] {
  return parsePlatforms(raw);
}

export function parseDayOfWeek(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  return isChecklistDayId(v) ? v : null;
}

function completionDto(row: TeamChecklistCompletion): TeamChecklistCompletionDto {
  const platforms = platformsFromJson(row.completedPlatforms);
  return {
    date: row.date,
    completedPlatforms: platforms,
    markedComplete: true,
  };
}

export function toTeamChecklistItemDto(
  item: TeamChecklistItem & { completions: TeamChecklistCompletion[] },
  today: string,
  extras?: Partial<TeamChecklistItemDto>
): TeamChecklistItemDto {
  const completionsByDate: Record<string, TeamChecklistCompletionDto> = {};
  for (const c of item.completions) {
    completionsByDate[c.date] = completionDto(c);
  }
  const todayRow = completionsByDate[today];
  return {
    id: item.id,
    checklistId: item.checklistId,
    title: item.title,
    description: item.description,
    instructions: item.instructions,
    dayOfWeek: item.dayOfWeek,
    platforms: platformsFromJson(item.platforms).length
      ? platformsFromJson(item.platforms)
      : [...SOCIAL_BOARD_PLATFORMS],
    sortOrder: item.sortOrder,
    completionsByDate,
    completedToday: Boolean(todayRow),
    completedPlatformsToday: todayRow?.completedPlatforms ?? [],
    ...extras,
  };
}

const DAY_SORT: Record<string, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6,
};

export function toTeamDailyChecklistDto(
  checklist: TeamDailyChecklist & {
    items: (TeamChecklistItem & { completions: TeamChecklistCompletion[] })[];
  },
  today: string
): TeamDailyChecklistDto {
  const kind = isChecklistKind(checklist.kind) ? checklist.kind : "stories";
  const items = [...checklist.items].sort((a, b) => {
    const da = a.dayOfWeek ? (DAY_SORT[a.dayOfWeek] ?? 99) : 98;
    const db = b.dayOfWeek ? (DAY_SORT[b.dayOfWeek] ?? 99) : 98;
    if (da !== db) return da - db;
    return a.sortOrder - b.sortOrder;
  });

  return {
    id: checklist.id,
    ownerId: checklist.ownerId,
    title: checklist.title,
    description: checklist.description,
    kind,
    outletId: checklist.outletId,
    sortOrder: checklist.sortOrder,
    items: items.map((item) => toTeamChecklistItemDto(item, today, { kind, outletId: checklist.outletId })),
    createdAt: checklist.createdAt.toISOString(),
    updatedAt: checklist.updatedAt.toISOString(),
  };
}

export function sortTeamChecklists<T extends { sortOrder: number; createdAt: Date }>(
  checklists: T[]
): T[] {
  return [...checklists].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

type ChecklistWithItems = TeamDailyChecklist & {
  items: (TeamChecklistItem & { completions: TeamChecklistCompletion[] })[];
};

export function buildChecklistBoard(
  checklists: ChecklistWithItems[],
  focusDate: string,
  now = new Date()
): ChecklistBoardDto {
  const day = buildBoardDayMeta(focusDate, now);
  const today = day.today;
  const dtos = sortTeamChecklists(checklists).map((c) => toTeamDailyChecklistDto(c, today));

  const storyLists = dtos.filter((c) => c.kind === "stories");
  const enabledOutletIds = storyLists
    .map((c) => c.outletId)
    .filter((id): id is string => Boolean(id));

  const overdueStories: TeamChecklistItemDto[] = [];
  const focusStories: TeamChecklistItemDto[] = [];
  const pastDates = lookbackDateKeys(focusDate);

  for (const list of storyLists) {
    for (const item of list.items) {
      if (!item.dayOfWeek || !isChecklistDayId(item.dayOfWeek)) continue;

      // Focus-day stories: item's weekday matches focus date
      if (item.dayOfWeek === day.focusDayId) {
        const targetDate = focusDate;
        const done = Boolean(item.completionsByDate[targetDate]);
        focusStories.push({
          ...item,
          targetDate,
          dueLabel: storyDueLabel(targetDate),
          isOverdue: !done && isStoryOverdue(targetDate, now),
          outletId: list.outletId,
          outletTitle: list.title,
          kind: "stories",
        });
      }

      // Overdue: any past occurrence of this weekday in lookback, incomplete after due
      for (const pastDate of pastDates) {
        if (dayIdForYmd(pastDate) !== item.dayOfWeek) continue;
        const done = Boolean(item.completionsByDate[pastDate]);
        if (done || !isStoryOverdue(pastDate, now)) continue;
        overdueStories.push({
          ...item,
          targetDate: pastDate,
          dueLabel: storyDueLabel(pastDate),
          isOverdue: true,
          outletId: list.outletId,
          outletTitle: list.title,
          kind: "stories",
        });
      }
    }
  }

  overdueStories.sort((a, b) => (a.targetDate ?? "").localeCompare(b.targetDate ?? ""));
  focusStories.sort((a, b) => a.sortOrder - b.sortOrder);

  const habits = dtos.find((c) => c.kind === "habits");
  const habitItem = habits?.items[0] ?? null;
  const habit: TeamChecklistItemDto | null = habitItem
    ? {
        ...habitItem,
        targetDate: focusDate,
        kind: "habits",
        completedToday: Boolean(habitItem.completionsByDate[focusDate]),
        completedPlatformsToday: habitItem.completionsByDate[focusDate]?.completedPlatforms ?? [],
      }
    : null;

  const postsList = dtos.find((c) => c.kind === "posts");
  const openPosts: TeamChecklistItemDto[] = (postsList?.items ?? [])
    .filter((item) => Object.keys(item.completionsByDate).length === 0)
    .map((item) => ({
      ...item,
      kind: "posts" as const,
      outletTitle: postsList?.title,
    }))
    .sort((a, b) => b.sortOrder - a.sortOrder);

  return {
    day,
    enabledOutletIds,
    overdueStories,
    focusStories,
    habit,
    openPosts,
    checklists: dtos,
  };
}
