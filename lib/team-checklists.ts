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
  WEEKEND_POST_DAY_IDS,
  WEEKEND_POST_LEAD_DAYS,
  type ChecklistDayId,
  type ChecklistKind,
  type WeekendPostDayId,
} from "@/lib/team-checklist-templates";
import { TEAM_AD_OUTLETS, teamOutletLabel } from "@/lib/team-outlets";

export {
  CHECKLIST_DAY_IDS,
  CHECKLIST_DAY_LABELS,
  CHECKLIST_DEFAULT_OWNER_ID,
  SOCIAL_BOARD_PLATFORMS,
  WEEKEND_POST_DAY_IDS,
  WEEKEND_POST_LEAD_DAYS,
  type ChecklistDayId,
  type ChecklistKind,
  type WeekendPostDayId,
};

export const CHECKLIST_PLATFORM_IDS = SOCIAL_BOARD_PLATFORMS;

export type ChecklistPlatformId = (typeof CHECKLIST_PLATFORM_IDS)[number];

export const CHECKLIST_PLATFORM_LABELS: Record<ChecklistPlatformId, string> = {
  meta: "Meta",
  youtube: "YouTube",
  google: "Google",
  linkedin: "LinkedIn",
  x: "X",
};

const TZ = "Asia/Kolkata";
/** Rolling window: today + up to 6 prior days of unfinished work (7 days total). */
const OVERDUE_LOOKBACK_DAYS = 6;

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

export type BoardWeekDay = {
  date: string;
  dayId: ChecklistDayId;
  /** Mon, Tue, … */
  dayLabel: string;
  /** 13 Jul */
  dateLabel: string;
  isToday: boolean;
};

export type BoardDayMeta = {
  focusDate: string;
  today: string;
  yesterday: string;
  tomorrow: string;
  focusDayId: ChecklistDayId;
  label: string;
  weekDays: BoardWeekDay[];
};

export type OutletBoardSection = {
  outletId: string;
  outletLabel: string;
  /** Today's story + stacked incomplete overdues from prior days. */
  stories: TeamChecklistItemDto[];
  openPosts: TeamChecklistItemDto[];
  /** Selected day's weekly ads (+ stacked incomplete overdues). */
  ads: TeamChecklistItemDto[];
};

export type ChecklistBoardDto = {
  day: BoardDayMeta;
  enabledOutletIds: string[];
  outlets: OutletBoardSection[];
  /** Posts not tied to an enabled outlet */
  generalPosts: TeamChecklistItemDto[];
  /** Sticky instructions for Postings / Ads tabs */
  boardNotes: { postings: string; ads: string };
  overdueStories: TeamChecklistItemDto[];
  focusStories: TeamChecklistItemDto[];
  habit: TeamChecklistItemDto | null;
  openPosts: TeamChecklistItemDto[];
  checklists: TeamDailyChecklistDto[];
};

export const BOARD_NOTES_CHECKLIST_TITLE = "Daily Checklist Notes";

export function parseBoardNotesDescription(raw: string | null | undefined): {
  postings: string;
  ads: string;
} {
  if (!raw?.trim()) return { postings: "", ads: "" };
  try {
    const parsed = JSON.parse(raw) as { postings?: unknown; ads?: unknown };
    return {
      postings: typeof parsed.postings === "string" ? parsed.postings : "",
      ads: typeof parsed.ads === "string" ? parsed.ads : "",
    };
  } catch {
    // Legacy plain text → postings
    return { postings: raw, ads: "" };
  }
}

export function serializeBoardNotes(notes: { postings: string; ads: string }): string {
  return JSON.stringify({
    postings: notes.postings.trim(),
    ads: notes.ads.trim(),
  });
}

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
  const targetDayId = dayIdForYmd(targetDateYmd);
  return `${CHECKLIST_DAY_LABELS[targetDayId].slice(0, 3)} ${formatBoardDateLabel(targetDateYmd)} · due ${formatBoardDateLabel(dueDay)} 10 PM`;
}

export function isStoryOverdue(targetDateYmd: string, now = new Date()): boolean {
  return now.getTime() > storyDueAtMs(targetDateYmd);
}

/** Weekend post target date → due date (4 days earlier). */
export function weekendPostDueYmd(targetDateYmd: string): string {
  return addDaysYmd(targetDateYmd, -WEEKEND_POST_LEAD_DAYS);
}

export function weekendPostDueAtMs(targetDateYmd: string): number {
  const dueDay = weekendPostDueYmd(targetDateYmd);
  const [y, m, d] = dueDay.split("-").map(Number);
  // 22:00 IST = 16:30 UTC
  return Date.UTC(y!, m! - 1, d!, 16, 30, 0);
}

export function weekendPostDueLabel(targetDateYmd: string): string {
  const dueDay = weekendPostDueYmd(targetDateYmd);
  const targetDayId = dayIdForYmd(targetDateYmd);
  return `${CHECKLIST_DAY_LABELS[targetDayId].slice(0, 3)} ${formatBoardDateLabel(targetDateYmd)} · due ${formatBoardDateLabel(dueDay)}`;
}

export function isWeekendPostOverdue(targetDateYmd: string, now = new Date()): boolean {
  return now.getTime() > weekendPostDueAtMs(targetDateYmd);
}

export function isWeekendPostDayId(v: string): v is WeekendPostDayId {
  return (WEEKEND_POST_DAY_IDS as readonly string[]).includes(v);
}

export function mondayOfWeekContaining(ymd: string): string {
  const dayId = dayIdForYmd(ymd);
  const idx = CHECKLIST_DAY_IDS.indexOf(dayId);
  return addDaysYmd(ymd, -idx);
}

export function formatBoardDateLabel(ymd: string): string {
  const d = parseYmd(ymd);
  return d.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  });
}

export function buildWeekDays(today: string, weekAnchorYmd = today): BoardWeekDay[] {
  const monday = mondayOfWeekContaining(weekAnchorYmd);
  return CHECKLIST_DAY_IDS.map((dayId, i) => {
    const date = addDaysYmd(monday, i);
    return {
      date,
      dayId,
      dayLabel: CHECKLIST_DAY_LABELS[dayId].slice(0, 3),
      dateLabel: formatBoardDateLabel(date),
      isToday: date === today,
    };
  });
}

export function buildBoardDayMeta(focusDate: string, now = new Date()): BoardDayMeta {
  const today = getTodayKey(now);
  const focusDayId = dayIdForYmd(focusDate);
  const weekDays = buildWeekDays(today, today);
  const focusInWeek = weekDays.find((d) => d.date === focusDate);
  const label = focusInWeek
    ? `${CHECKLIST_DAY_LABELS[focusDayId]} · ${focusInWeek.dateLabel}`
    : `${CHECKLIST_DAY_LABELS[focusDayId]} · ${formatBoardDateLabel(focusDate)}`;

  return {
    focusDate,
    today,
    yesterday: addDaysYmd(today, -1),
    tomorrow: addDaysYmd(today, 1),
    focusDayId,
    label,
    weekDays,
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
  // Keep the window tight — only the focus week (+ neighbors for due dates).
  const keys = new Set<string>();
  const monday = mondayOfWeekContaining(focusDate);
  for (let i = 0; i < 7; i++) keys.add(addDaysYmd(monday, i));
  // Weekend posts are due 4 days before Fri/Sat/Sun (Mon/Tue/Wed) — already in week.
  // Stories due previous day may fall on prior Sunday when focus is Monday.
  keys.add(addDaysYmd(monday, -1));
  keys.add(focusDate);
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
  return v === "stories" || v === "posts" || v === "habits" || v === "ads";
}

export function parsePlatforms(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    let id = item.trim().toLowerCase();
    // Legacy ids from earlier IG/FB boards
    if (id === "instagram" || id === "facebook") id = "meta";
    if (id === "twitter") id = "x";
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

  const storyLists = dtos.filter((c) => c.kind === "stories" && c.outletId);
  const enabledOutletIds = storyLists
    .map((c) => c.outletId)
    .filter((id): id is string => Boolean(id));

  const overdueStories: TeamChecklistItemDto[] = [];
  const focusStories: TeamChecklistItemDto[] = [];
  const focusAds: TeamChecklistItemDto[] = [];

  // Stories due day-before flyer: today = tomorrow's story; unfinished from the past 6 days stack in.
  // 7-day window total (dueOffset 0..6) — ignore older backlog.
  for (let dueOffset = 0; dueOffset <= OVERDUE_LOOKBACK_DAYS; dueOffset++) {
    const dueDate = addDaysYmd(focusDate, -dueOffset);
    const targetDate = addDaysYmd(dueDate, 1);
    const targetDayId = dayIdForYmd(targetDate);

    for (const list of storyLists) {
      for (const item of list.items) {
        if (!item.dayOfWeek || !isChecklistDayId(item.dayOfWeek)) continue;
        if (item.dayOfWeek !== targetDayId) continue;

        const done = Boolean(item.completionsByDate[targetDate]);
        if (done) continue;

        const pastDue = dueOffset > 0 || isStoryOverdue(targetDate, now);
        const row: TeamChecklistItemDto = {
          ...item,
          targetDate,
          dueLabel: storyDueLabel(targetDate),
          isOverdue: pastDue,
          outletId: list.outletId,
          outletTitle: list.title,
          kind: "stories",
        };
        focusStories.push(row);
        if (pastDue) overdueStories.push(row);
      }
    }
  }

  // Oldest overdue first, then today's due story
  focusStories.sort((a, b) => {
    const ad = a.targetDate ?? "";
    const bd = b.targetDate ?? "";
    if (ad !== bd) return ad.localeCompare(bd);
    return a.sortOrder - b.sortOrder;
  });
  overdueStories.sort((a, b) => (a.targetDate ?? "").localeCompare(b.targetDate ?? ""));

  const adLists = dtos.filter((c) => c.kind === "ads" && c.outletId);
  const monday = mondayOfWeekContaining(focusDate);
  // Only this week + prior week (stays inside ~7-day overdue window)
  const adWeekMondays = [monday, addDaysYmd(monday, -7)];
  for (const weekMonday of adWeekMondays) {
    for (const list of adLists) {
      for (const item of list.items) {
        if (!item.dayOfWeek || !isWeekendPostDayId(item.dayOfWeek)) continue;
        const wantIdx = CHECKLIST_DAY_IDS.indexOf(item.dayOfWeek);
        const targetDate = addDaysYmd(weekMonday, wantIdx);
        const dueDate = weekendPostDueYmd(targetDate);
        if (focusDate < dueDate) continue;
        const done = Boolean(item.completionsByDate[targetDate]);
        if (done) continue;
        // Stack past the due day until completed (within lookback from due)
        if (focusDate > addDaysYmd(dueDate, OVERDUE_LOOKBACK_DAYS)) continue;
        const pastDue = focusDate > dueDate || isWeekendPostOverdue(targetDate, now);
        focusAds.push({
          ...item,
          targetDate,
          dueLabel: weekendPostDueLabel(targetDate),
          isOverdue: pastDue,
          outletId: list.outletId,
          outletTitle: list.title,
          kind: "ads",
        });
      }
    }
  }
  focusAds.sort((a, b) => {
    const ad = a.targetDate ?? "";
    const bd = b.targetDate ?? "";
    if (ad !== bd) return ad.localeCompare(bd);
    return a.sortOrder - b.sortOrder;
  });

  const habits = dtos.find((c) => c.kind === "habits" && c.title !== BOARD_NOTES_CHECKLIST_TITLE);
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

  const postLists = dtos.filter((c) => c.kind === "posts");
  const allOpenPosts: TeamChecklistItemDto[] = [];

  for (const postsList of postLists) {
    for (const item of postsList.items) {
      const fromChecklist = postsList.outletId;
      const fromDesc = outletIdFromPostText(item.description);
      const outletId = fromChecklist || fromDesc || null;

      // Recurring Fri/Sat/Sun posts — due 4 days before; incomplete ones keep stacking
      if (item.dayOfWeek && isWeekendPostDayId(item.dayOfWeek)) {
        const wantIdx = CHECKLIST_DAY_IDS.indexOf(item.dayOfWeek);
        // Check this week and prior weeks for stacked overdues
        for (const weekMonday of [monday, addDaysYmd(monday, -7)]) {
          const targetDate = addDaysYmd(weekMonday, wantIdx);
          const dueDate = weekendPostDueYmd(targetDate);
          const done = Boolean(item.completionsByDate[targetDate]);
          if (done) continue;
          if (focusDate < dueDate) continue;
          if (focusDate > addDaysYmd(dueDate, OVERDUE_LOOKBACK_DAYS)) continue;
          const pastDue =
            focusDate > targetDate || isWeekendPostOverdue(targetDate, now);
          allOpenPosts.push({
            ...item,
            kind: "posts",
            outletId,
            outletTitle: outletId ? teamOutletLabel(outletId) : postsList.title,
            targetDate,
            dueLabel: weekendPostDueLabel(targetDate),
            isOverdue: pastDue,
          });
        }
        continue;
      }

      // Ad-hoc one-shot posts
      if (Object.keys(item.completionsByDate).length > 0) continue;
      allOpenPosts.push({
        ...item,
        kind: "posts",
        outletId,
        outletTitle: outletId ? teamOutletLabel(outletId) : postsList.title,
      });
    }
  }
  allOpenPosts.sort((a, b) => {
    const ad = a.targetDate ?? "";
    const bd = b.targetDate ?? "";
    if (ad && bd && ad !== bd) return ad.localeCompare(bd);
    return a.sortOrder - b.sortOrder;
  });

  const outletOrder: string[] = TEAM_AD_OUTLETS.map((o) => o.id).filter((id) =>
    enabledOutletIds.includes(id)
  );
  // include any enabled ids not in the static list
  for (const id of enabledOutletIds) {
    if (!outletOrder.includes(id)) outletOrder.push(id);
  }

  const outlets: OutletBoardSection[] = outletOrder.map((outletId) => {
    const outletLabel = teamOutletLabel(outletId);
    const stories = focusStories.filter((s) => s.outletId === outletId);
    const openPosts = allOpenPosts.filter((p) => p.outletId === outletId);
    const ads = focusAds.filter((a) => a.outletId === outletId);
    return { outletId, outletLabel, stories, openPosts, ads };
  });

  const generalPosts = allOpenPosts.filter(
    (p) => !p.outletId || !enabledOutletIds.includes(p.outletId)
  );

  const notesList = dtos.find((c) => c.kind === "habits" && !c.outletId);
  const notesReady =
    notesList &&
    (notesList.title === BOARD_NOTES_CHECKLIST_TITLE ||
      Boolean(notesList.description?.trim().startsWith("{")));
  const boardNotes = notesReady
    ? parseBoardNotesDescription(notesList.description)
    : { postings: "", ads: "" };

  return {
    day,
    enabledOutletIds,
    outlets,
    generalPosts,
    boardNotes,
    overdueStories,
    focusStories,
    habit,
    openPosts: allOpenPosts,
    checklists: dtos,
  };
}

function outletIdFromPostText(description: string | null | undefined): string | null {
  if (!description) return null;
  const match = description.match(/(?:^|\n)Outlet:\s*(.+?)(?:\n|$)/i);
  const label = match?.[1]?.trim();
  if (!label) return null;
  const hit = TEAM_AD_OUTLETS.find((o) => o.label.toLowerCase() === label.toLowerCase());
  return hit?.id ?? null;
}
