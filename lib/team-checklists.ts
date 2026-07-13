import type {
  TeamDailyChecklist,
  TeamChecklistItem,
  TeamChecklistCompletion,
} from "@prisma/client";
import { Prisma } from "@prisma/client";

export const CHECKLIST_PLATFORM_IDS = [
  "instagram",
  "youtube",
  "linkedin",
  "facebook",
  "twitter",
] as const;

export type ChecklistPlatformId = (typeof CHECKLIST_PLATFORM_IDS)[number];

export const CHECKLIST_PLATFORM_LABELS: Record<ChecklistPlatformId, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  twitter: "Twitter",
};

export const CHECKLIST_DAY_IDS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type ChecklistDayId = (typeof CHECKLIST_DAY_IDS)[number];

export const CHECKLIST_DAY_LABELS: Record<ChecklistDayId, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const TZ = "Asia/Kolkata";

export type TeamChecklistCompletionDto = {
  date: string;
  completedPlatforms: string[];
  markedComplete: boolean;
};

export type TeamChecklistItemDto = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  dayOfWeek: string | null;
  platforms: string[];
  sortOrder: number;
  /** Completions keyed by YYYY-MM-DD for the requested week. */
  completionsByDate: Record<string, TeamChecklistCompletionDto>;
  /** Convenience for “today” in IST. */
  completedToday: boolean;
  completedPlatformsToday: string[];
};

export type TeamDailyChecklistDto = {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  items: TeamChecklistItemDto[];
  createdAt: string;
  updatedAt: string;
};

export type WeekMeta = {
  label: string;
  dates: string;
  mondayKey: string;
  sundayKey: string;
  /** Mon–Sun YYYY-MM-DD in IST */
  dayKeys: string[];
  /** dayId → YYYY-MM-DD */
  dateByDay: Record<ChecklistDayId, string>;
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

/** Parse YYYY-MM-DD as a UTC noon Date for stable calendar math. */
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

export function getCurrentWeekMeta(now = new Date()): WeekMeta {
  const todayKey = getTodayKey(now);
  const today = parseYmd(todayKey);
  const dow = today.getUTCDay(); // 0 Sun … 6 Sat
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + mondayOffset);

  const dayKeys: string[] = [];
  const dateByDay = {} as Record<ChecklistDayId, string>;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    const key = formatYmdUtc(d);
    dayKeys.push(key);
    dateByDay[CHECKLIST_DAY_IDS[i]!] = key;
  }

  const sunday = parseYmd(dayKeys[6]!);
  const monthName = monday.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  const weekNum = Math.ceil(monday.getUTCDate() / 7);

  const fmt = (key: string) =>
    parseYmd(key).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

  return {
    label: `${monthName.toUpperCase()} Week ${weekNum}`,
    dates: `${fmt(dayKeys[0]!)} – ${fmt(dayKeys[6]!)}`,
    mondayKey: dayKeys[0]!,
    sundayKey: dayKeys[6]!,
    dayKeys,
    dateByDay,
  };
}

export function isChecklistDayId(v: string): v is ChecklistDayId {
  return (CHECKLIST_DAY_IDS as readonly string[]).includes(v);
}

export function isChecklistPlatformId(v: string): v is ChecklistPlatformId {
  return (CHECKLIST_PLATFORM_IDS as readonly string[]).includes(v);
}

export function parsePlatforms(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const id = item.trim().toLowerCase();
    if (!isChecklistPlatformId(id) || seen.has(id)) continue;
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

/** Date key for an item in the current week (null dayOfWeek → today). */
export function itemDateKeyForWeek(
  dayOfWeek: string | null | undefined,
  week: WeekMeta,
  todayKey = getTodayKey()
): string {
  if (dayOfWeek && isChecklistDayId(dayOfWeek)) {
    return week.dateByDay[dayOfWeek];
  }
  return todayKey;
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
  today: string
): TeamChecklistItemDto {
  const completionsByDate: Record<string, TeamChecklistCompletionDto> = {};
  for (const c of item.completions) {
    completionsByDate[c.date] = completionDto(c);
  }
  const todayRow = completionsByDate[today];
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    instructions: item.instructions,
    dayOfWeek: item.dayOfWeek,
    platforms: platformsFromJson(item.platforms),
    sortOrder: item.sortOrder,
    completionsByDate,
    completedToday: Boolean(todayRow),
    completedPlatformsToday: todayRow?.completedPlatforms ?? [],
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
    sortOrder: checklist.sortOrder,
    items: items.map((item) => toTeamChecklistItemDto(item, today)),
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
