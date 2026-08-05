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
  DRIVE_CHECKLIST_KIND,
  DRIVE_HABIT_ITEM_TITLE,
  parseDriveOutcome,
  SOCIAL_BOARD_PLATFORMS,
  WEEKEND_POST_DAY_IDS,
  WEEKEND_POST_LEAD_DAYS,
  type ChecklistDayId,
  type ChecklistKind,
  type WeekendPostDayId,
} from "@/lib/team-checklist-templates";
import { TEAM_AD_OUTLETS, outletKindTitle, teamOutletLabel } from "@/lib/team-outlets";

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
/**
 * Board go-live for overdue stacking — only unfinished work from this day
 * forward stacks (7-day rolling window). Earlier synthetic backlog is ignored.
 */
const OVERDUE_EPOCH_YMD = "2026-07-14";

export type TeamChecklistCompletionDto = {
  date: string;
  completedPlatforms: string[];
  markedComplete: boolean;
};

export type HandoffFormat = "story" | "post" | "reel" | "ad";
/** wait = not approved · approved = admin OK, designer must upload · ready = file live for Amit */
export type HandoffStatus = "wait" | "approved" | "ready";

export type ChecklistHandoffDto = {
  status: HandoffStatus;
  format?: HandoffFormat | null;
  fileUrl?: string | null;
  /** Extra creatives (same job) — Amit must download all before posting. */
  fileUrls?: string[];
  postingNotes?: string | null;
  scheduleNote?: string | null;
  /** ISO time when file was sent to Amit (for ~7 day blob cleanup). */
  uploadedAt?: string | null;
};

/** Primary + extras for download UI. */
export function handoffCreativeUrls(
  handoff: ChecklistHandoffDto | null | undefined
): string[] {
  if (!handoff) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string | null | undefined) => {
    const u = typeof raw === "string" ? raw.trim() : "";
    if (!u || seen.has(u)) return;
    seen.add(u);
    out.push(u);
  };
  push(handoff.fileUrl);
  if (Array.isArray(handoff.fileUrls)) {
    for (const u of handoff.fileUrls) push(u);
  }
  return out;
}

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
  /** Target dates where creatives are ready (green) for Amit. */
  readyDates: string[];
  /** Raw per-date handoff map (server). */
  handoffByDate?: Record<string, ChecklistHandoffDto>;
  /** For this row's targetDate — file uploaded & ready for Amit to post. */
  creativeReady?: boolean;
  /** For this row's targetDate — approve → upload → ready. */
  handoff?: ChecklistHandoffDto;
  /** Story target date or habit/post date this row is about */
  targetDate?: string;
  dueLabel?: string;
  isOverdue?: boolean;
  outletId?: string | null;
  outletTitle?: string;
  kind?: ChecklistKind;
  /** Drive habit only: posted vs nothing new. */
  driveOutcome?: "done" | "nothing_new" | null;
};

export const HANDOFF_FORMATS: HandoffFormat[] = ["story", "post", "reel", "ad"];

export function defaultHandoffFormat(kind?: ChecklistKind | null): HandoffFormat {
  if (kind === "stories") return "story";
  if (kind === "ads") return "ad";
  return "post";
}

export function parseHandoffFormat(raw: unknown): HandoffFormat | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  return HANDOFF_FORMATS.includes(v as HandoffFormat) ? (v as HandoffFormat) : null;
}

function parseHandoffFileUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const u = item.trim();
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

function parseHandoffEntry(raw: unknown): ChecklistHandoffDto | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const statusRaw = typeof o.status === "string" ? o.status.trim().toLowerCase() : "";
  const status: HandoffStatus =
    statusRaw === "ready" || statusRaw === "approved" ? statusRaw : "wait";
  const fileUrls = parseHandoffFileUrls(o.fileUrls);
  if (
    status === "wait" &&
    !o.fileUrl &&
    fileUrls.length === 0 &&
    !o.format &&
    !o.postingNotes &&
    !o.scheduleNote
  ) {
    return { status: "wait" };
  }
  const fileUrl =
    typeof o.fileUrl === "string" && o.fileUrl.trim() ? o.fileUrl.trim() : null;
  return {
    status,
    format: parseHandoffFormat(o.format),
    fileUrl: fileUrl ?? fileUrls[0] ?? null,
    fileUrls: handoffCreativeUrls({
      status,
      fileUrl,
      fileUrls,
    }),
    postingNotes:
      typeof o.postingNotes === "string" && o.postingNotes.trim() ? o.postingNotes.trim() : null,
    scheduleNote:
      typeof o.scheduleNote === "string" && o.scheduleNote.trim() ? o.scheduleNote.trim() : null,
    uploadedAt:
      typeof o.uploadedAt === "string" && o.uploadedAt.trim() ? o.uploadedAt.trim() : null,
  };
}

/** Parse TeamChecklistItem.handoff JSON → per-date map. */
export function handoffByDateFromJson(
  raw: Prisma.JsonValue | null | undefined
): Record<string, ChecklistHandoffDto> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, ChecklistHandoffDto> = {};
  for (const [date, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const parsed = parseHandoffEntry(entry);
    if (parsed) out[date] = parsed;
  }
  return out;
}

export function handoffForDate(
  handoffByDate: Record<string, ChecklistHandoffDto> | undefined,
  readyDates: string[] | null | undefined,
  dateKey: string | null | undefined
): ChecklistHandoffDto {
  if (!dateKey) return { status: "wait" };
  const entry = handoffByDate?.[dateKey];
  const fileUrls = handoffCreativeUrls(entry);
  const base = {
    format: entry?.format ?? null,
    fileUrl: fileUrls[0] ?? entry?.fileUrl ?? null,
    fileUrls,
    postingNotes: entry?.postingNotes ?? null,
    scheduleNote: entry?.scheduleNote ?? null,
    uploadedAt: entry?.uploadedAt ?? null,
  };
  const hasFile = fileUrls.length > 0;

  if (entry?.status === "ready") {
    // Never treat Ready-without-file as Ready (old bad data / admin bypass).
    if (!hasFile) {
      return { status: "wait", ...base, fileUrl: null, fileUrls: [] };
    }
    return { status: "ready", ...base };
  }
  if (entry?.status === "approved") {
    return { status: "approved", ...base };
  }
  // Legacy readyDates only count when a file exists
  if (isCreativeReadyForDate(readyDates, dateKey) && hasFile) {
    return { status: "ready", ...base };
  }
  return { status: "wait", ...base };
}

/** True only when Amit can download a creative. */
export function isHandoffDownloadReady(
  handoff: ChecklistHandoffDto | null | undefined
): boolean {
  return handoff?.status === "ready" && handoffCreativeUrls(handoff).length > 0;
}

/** Persist per-date handoff map (supports multi-file creatives). */
export function serializeHandoffMap(
  map: Record<string, ChecklistHandoffDto>
): Prisma.InputJsonValue {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [date, entry] of Object.entries(map)) {
    const urls = handoffCreativeUrls(entry);
    if (
      entry.status === "wait" &&
      urls.length === 0 &&
      !entry.postingNotes &&
      !entry.scheduleNote &&
      !entry.format
    ) {
      continue;
    }
    const row: Record<string, unknown> = { status: entry.status };
    if (entry.format) row.format = entry.format;
    if (urls[0]) row.fileUrl = urls[0];
    if (urls.length > 0) row.fileUrls = urls;
    if (entry.postingNotes) row.postingNotes = entry.postingNotes;
    if (entry.scheduleNote) row.scheduleNote = entry.scheduleNote;
    if (entry.uploadedAt) row.uploadedAt = entry.uploadedAt;
    out[date] = row;
  }
  return out as Prisma.InputJsonValue;
}

export function applyHandoffToRow(
  item: TeamChecklistItemDto,
  dateKey: string
): TeamChecklistItemDto {
  const handoff = handoffForDate(item.handoffByDate, item.readyDates, dateKey);
  return {
    ...item,
    handoff,
    creativeReady: handoff.status === "ready",
  };
}

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
  /** Sticky instructions for Postings / Ads tabs + admin Drive folders */
  boardNotes: {
    postings: string;
    ads: string;
    driveFolderUrl: string;
    driveFolders: DriveFolderEntry[];
  };
  /** Recently completed items (summary popup). */
  doneItems: TeamChecklistItemDto[];
  overdueStories: TeamChecklistItemDto[];
  focusStories: TeamChecklistItemDto[];
  /** Compulsory daily Drive photo check (Amit). */
  habit: TeamChecklistItemDto | null;
  openPosts: TeamChecklistItemDto[];
  checklists: TeamDailyChecklistDto[];
  /** Ready (undone) item counts keyed by go-live date — for date-strip badges */
  readyCountByDate: Record<string, number>;
};

export const BOARD_NOTES_CHECKLIST_TITLE = "Daily Checklist Notes";

/** Admin-configured Drive folders for Amit’s daily photo check. */
export type DriveFolderEntry = {
  id: string;
  url: string;
  outletIds: string[];
  description: string;
};

function newDriveFolderId(): string {
  return `drv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseDriveFolders(
  raw: unknown,
  legacyUrl: string
): DriveFolderEntry[] {
  const out: DriveFolderEntry[] = [];
  if (Array.isArray(raw)) {
    for (const row of raw) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const url = typeof r.url === "string" ? r.url.trim() : "";
      if (!url) continue;
      const outletIds = Array.isArray(r.outletIds)
        ? r.outletIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
            .map((id) => id.trim())
        : [];
      out.push({
        id: typeof r.id === "string" && r.id.trim() ? r.id.trim() : newDriveFolderId(),
        url,
        outletIds,
        description: typeof r.description === "string" ? r.description.trim() : "",
      });
    }
  }
  if (out.length === 0 && legacyUrl) {
    out.push({
      id: newDriveFolderId(),
      url: legacyUrl,
      outletIds: [],
      description: "",
    });
  }
  return out;
}

export function parseBoardNotesDescription(raw: string | null | undefined): {
  postings: string;
  ads: string;
  driveFolderUrl: string;
  driveFolders: DriveFolderEntry[];
} {
  if (!raw?.trim()) {
    return { postings: "", ads: "", driveFolderUrl: "", driveFolders: [] };
  }
  try {
    const parsed = JSON.parse(raw) as {
      postings?: unknown;
      ads?: unknown;
      driveFolderUrl?: unknown;
      driveFolders?: unknown;
    };
    const driveFolderUrl =
      typeof parsed.driveFolderUrl === "string" ? parsed.driveFolderUrl.trim() : "";
    const driveFolders = parseDriveFolders(parsed.driveFolders, driveFolderUrl);
    return {
      postings: typeof parsed.postings === "string" ? parsed.postings : "",
      ads: typeof parsed.ads === "string" ? parsed.ads : "",
      // Keep first URL for older clients
      driveFolderUrl: driveFolders[0]?.url ?? driveFolderUrl,
      driveFolders,
    };
  } catch {
    return { postings: raw, ads: "", driveFolderUrl: "", driveFolders: [] };
  }
}

export function serializeBoardNotes(notes: {
  postings: string;
  ads: string;
  driveFolderUrl?: string;
  driveFolders?: DriveFolderEntry[];
}): string {
  const folders =
    notes.driveFolders ??
    (notes.driveFolderUrl?.trim()
      ? [
          {
            id: newDriveFolderId(),
            url: notes.driveFolderUrl.trim(),
            outletIds: [] as string[],
            description: "",
          },
        ]
      : []);
  const cleaned = folders
    .map((f) => ({
      id: f.id?.trim() || newDriveFolderId(),
      url: f.url.trim(),
      outletIds: [...new Set(f.outletIds.map((id) => id.trim()).filter(Boolean))],
      description: (f.description ?? "").trim(),
    }))
    .filter((f) => f.url.length > 0);
  return JSON.stringify({
    postings: notes.postings.trim(),
    ads: notes.ads.trim(),
    driveFolderUrl: cleaned[0]?.url ?? "",
    driveFolders: cleaned,
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

/** Earliest due date that may stack as overdue on this focus day. */
function earliestOverdueDueYmd(focusDate: string): string {
  const windowStart = addDaysYmd(focusDate, -OVERDUE_LOOKBACK_DAYS);
  return windowStart < OVERDUE_EPOCH_YMD ? OVERDUE_EPOCH_YMD : windowStart;
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

/** IST wall clock → UTC ms on that calendar YMD. */
function amitDueAtMsOnYmd(dueDayYmd: string, hourIst: number, minuteIst = 0): number {
  const [y, m, d] = dueDayYmd.split("-").map(Number);
  // IST = UTC+5:30
  const utcMinutes = hourIst * 60 + minuteIst - (5 * 60 + 30);
  const utcHour = Math.floor(utcMinutes / 60);
  const utcMin = ((utcMinutes % 60) + 60) % 60;
  const dayAdjust = utcMinutes < 0 ? -1 : 0;
  const base = Date.UTC(y!, m! - 1, d!, 0, 0, 0);
  return base + dayAdjust * 86_400_000 + utcHour * 3_600_000 + utcMin * 60_000;
}

/**
 * Story deadlines (IST), day before go-live:
 * - Jeslyn design done by 8:00 PM
 * - Amit posts by 11:00 PM (aim ~10 PM, not before 8 PM — 24h story)
 * Mon flyer → Sunday 8 PM (Jeslyn) / Sunday 11 PM (Amit).
 */
export function storyDesignDueAtMs(targetDateYmd: string): number {
  return amitDueAtMsOnYmd(previousDayYmd(targetDateYmd), 20, 0);
}

export function storyDueAtMs(targetDateYmd: string): number {
  return amitDueAtMsOnYmd(previousDayYmd(targetDateYmd), 23, 0);
}

export function storyDueLabel(targetDateYmd: string, today = getTodayKey()): string {
  const dueDay = previousDayYmd(targetDateYmd);
  const targetDayId = dayIdForYmd(targetDateYmd);
  const designWhen =
    dueDay === today
      ? "design due TODAY by 8 PM"
      : `design due ${formatBoardDateLabel(dueDay)} by 8 PM`;
  const postWhen =
    dueDay === today
      ? "Amit post by 11 PM"
      : `Amit post by ${formatBoardDateLabel(dueDay)} 11 PM`;
  return `${CHECKLIST_DAY_LABELS[targetDayId]} story · ${designWhen} · ${postWhen} · aim ~10 PM`;
}

export function isStoryOverdue(targetDateYmd: string, now = new Date()): boolean {
  // Red once Amit’s post window is missed (design-due is earlier the same day).
  return now.getTime() > storyDueAtMs(targetDateYmd);
}

/**
 * Weekend creative / ad start day (Fri → Mon). When Mahesh delivers and ads should start.
 */
export function weekendPostDueYmd(targetDateYmd: string): string {
  return addDaysYmd(targetDateYmd, -WEEKEND_POST_LEAD_DAYS);
}

/** When Amit must have the weekend post live — day before go-live at 11 PM. */
export function weekendPublishDueYmd(targetDateYmd: string): string {
  return previousDayYmd(targetDateYmd);
}

export function weekendPublishDueAtMs(targetDateYmd: string): number {
  return amitDueAtMsOnYmd(weekendPublishDueYmd(targetDateYmd), 23, 0);
}

/** Ad start deadline — same −4d / 8 PM as Mahesh creative. */
export function weekendAdDueAtMs(targetDateYmd: string): number {
  return amitDueAtMsOnYmd(weekendPostDueYmd(targetDateYmd), 20, 0);
}

/**
 * Weekend post — Mahesh creative due: go-live − 4 days @ 8 PM IST.
 * Fri → Mon 8 PM, Sat → Tue 8 PM, Sun → Wed 8 PM.
 */
export function weekendPostDueAtMs(targetDateYmd: string): number {
  return amitDueAtMsOnYmd(weekendPostDueYmd(targetDateYmd), 20, 0);
}

export function weekendPostDueLabel(targetDateYmd: string, today = getTodayKey()): string {
  const designBy = weekendPostDueYmd(targetDateYmd);
  const publishBy = weekendPublishDueYmd(targetDateYmd);
  const targetDayId = dayIdForYmd(targetDateYmd);
  const designWhen =
    designBy === today
      ? "Mahesh due TODAY by 8 PM (−4d)"
      : `Mahesh due ${formatBoardDateLabel(designBy)} by 8 PM (−4d)`;
  const postWhen =
    publishBy === today
      ? "Amit post by TODAY 11 PM"
      : `Amit post by ${formatBoardDateLabel(publishBy)} 11 PM`;
  return `${CHECKLIST_DAY_LABELS[targetDayId]} post · ${designWhen} · ${postWhen}`;
}

export function weekendAdDueLabel(targetDateYmd: string, today = getTodayKey()): string {
  const startBy = weekendPostDueYmd(targetDateYmd);
  const targetDayId = dayIdForYmd(targetDateYmd);
  const when =
    startBy === today
      ? "START ADS TODAY by 8 PM"
      : `start ads by ${formatBoardDateLabel(startBy)} 8 PM`;
  return `${CHECKLIST_DAY_LABELS[targetDayId]} ad · ${when} (same −4d as Mahesh)`;
}

/** Red if Mahesh delivery OR Amit post window is past. */
export function isWeekendPostOverdue(targetDateYmd: string, now = new Date()): boolean {
  const t = now.getTime();
  return t > weekendPostDueAtMs(targetDateYmd) || t > weekendPublishDueAtMs(targetDateYmd);
}

export function isWeekendAdOverdue(targetDateYmd: string, now = new Date()): boolean {
  return now.getTime() > weekendAdDueAtMs(targetDateYmd);
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

export function buildWeekDays(today: string, _weekAnchorYmd = today): BoardWeekDay[] {
  // Today + next 7 days only (no past dates on the strip).
  return Array.from({ length: 8 }, (_, i) => {
    const date = addDaysYmd(today, i);
    const dayId = dayIdForYmd(date);
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
  // Never keep focus in the past — snap to today.
  const safeFocus = focusDate < today ? today : focusDate;
  const focusDayId = dayIdForYmd(safeFocus);
  const weekDays = buildWeekDays(today, today);
  const focusInWeek = weekDays.find((d) => d.date === safeFocus);
  const label = focusInWeek
    ? `${CHECKLIST_DAY_LABELS[focusDayId]} · ${focusInWeek.dateLabel}`
    : `${CHECKLIST_DAY_LABELS[focusDayId]} · ${formatBoardDateLabel(safeFocus)}`;

  return {
    focusDate: safeFocus,
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
  return (
    v === "stories" || v === "posts" || v === "habits" || v === "ads" || v === "drive"
  );
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

/** Dates where admin marked creatives ready (green) for Amit. */
export function readyDatesFromJson(raw: Prisma.JsonValue | null | undefined): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const d = item.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || seen.has(d)) continue;
    seen.add(d);
    out.push(d);
  }
  return out;
}

export function isCreativeReadyForDate(
  readyDates: string[] | null | undefined,
  dateKey: string | null | undefined
): boolean {
  if (!dateKey || !readyDates?.length) return false;
  return readyDates.includes(dateKey);
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
  const readyDates = readyDatesFromJson(item.readyDates);
  const handoffByDate = handoffByDateFromJson(item.handoff);
  const merged = {
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
    readyDates,
    handoffByDate,
    ...extras,
  };
  const dateKey = merged.targetDate ?? today;
  const handoff = handoffForDate(handoffByDate, readyDates, dateKey);
  return {
    ...merged,
    handoff,
    creativeReady: handoff.status === "ready",
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
  const focus = day.focusDate;
  const dtos = sortTeamChecklists(checklists).map((c) => toTeamDailyChecklistDto(c, today));

  const storyLists = dtos.filter((c) => c.kind === "stories" && c.outletId);
  const enabledOutletIds = storyLists
    .map((c) => c.outletId)
    .filter((id): id is string => Boolean(id));

  const overdueStories: TeamChecklistItemDto[] = [];
  const focusStories: TeamChecklistItemDto[] = [];
  const focusAds: TeamChecklistItemDto[] = [];

  // Stories: today = tomorrow's flyer; unfinished stack only from go-live within 7 days.
  const overdueDueFloor = earliestOverdueDueYmd(focus);
  for (let dueOffset = 0; dueOffset <= OVERDUE_LOOKBACK_DAYS; dueOffset++) {
    const dueDate = addDaysYmd(focus, -dueOffset);
    if (dueDate < overdueDueFloor) continue;
    const targetDate = addDaysYmd(dueDate, 1);
    const targetDayId = dayIdForYmd(targetDate);

    for (const list of storyLists) {
      for (const item of list.items) {
        if (!item.dayOfWeek || !isChecklistDayId(item.dayOfWeek)) continue;
        if (item.dayOfWeek !== targetDayId) continue;

        const done = Boolean(item.completionsByDate[targetDate]);
        if (done) continue;

        // Overdue only after design due datetime (day-before @ 8 PM IST), not midnight.
        const pastDue = now.getTime() > storyDesignDueAtMs(targetDate);
        const row = applyHandoffToRow(
          {
            ...item,
            targetDate,
            dueLabel: storyDueLabel(targetDate, focus),
            isOverdue: pastDue,
            outletId: list.outletId,
            outletTitle: outletKindTitle(list.outletId ?? list.title, "stories"),
            kind: "stories",
          },
          targetDate
        );
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
  const monday = mondayOfWeekContaining(focus);
  // Only this week + prior week (stays inside ~7-day overdue window)
  const adWeekMondays = [monday, addDaysYmd(monday, -7)];
  const adsSeen = new Set<string>();
  for (const weekMonday of adWeekMondays) {
    for (const list of adLists) {
      for (const item of list.items) {
        if (!item.dayOfWeek || !isWeekendPostDayId(item.dayOfWeek)) continue;
        const wantIdx = CHECKLIST_DAY_IDS.indexOf(item.dayOfWeek);
        const targetDate = addDaysYmd(weekMonday, wantIdx);
        const dueDate = weekendPostDueYmd(targetDate);
        if (dueDate < overdueDueFloor) continue;
        const done = Boolean(item.completionsByDate[targetDate]);
        if (done) continue;
        if (focus > addDaysYmd(dueDate, OVERDUE_LOOKBACK_DAYS)) continue;
        const pastDue = isWeekendAdOverdue(targetDate, now);
        const adRow = applyHandoffToRow(
          {
            ...item,
            targetDate,
            dueLabel: weekendAdDueLabel(targetDate, focus),
            isOverdue: pastDue,
            outletId: list.outletId,
            outletTitle: outletKindTitle(list.outletId ?? list.title, "ads"),
            kind: "ads",
          },
          targetDate
        );
        // Before start day: only show if downloadable Ready (same creative as story/post).
        if (focus < dueDate && !isHandoffDownloadReady(adRow.handoff)) continue;
        // Dedupe: one row per outlet+go-live (avoids double lists / old orphans).
        const dedupeKey = `${list.outletId ?? ""}:${targetDate}:${item.dayOfWeek}`;
        if (adsSeen.has(dedupeKey)) continue;
        adsSeen.add(dedupeKey);
        focusAds.push(adRow);
      }
    }
  }
  focusAds.sort((a, b) => {
    const ad = a.targetDate ?? "";
    const bd = b.targetDate ?? "";
    if (ad !== bd) return ad.localeCompare(bd);
    return a.sortOrder - b.sortOrder;
  });

  // Own checklist kind so board-notes / habits flow stays untouched.
  const driveList = dtos.find((c) => c.kind === DRIVE_CHECKLIST_KIND && !c.outletId);
  const habitItem =
    driveList?.items.find((i) => i.title === DRIVE_HABIT_ITEM_TITLE) ??
    driveList?.items[0] ??
    null;
  const habitPlatformsToday = habitItem?.completionsByDate[focus]?.completedPlatforms ?? [];
  const habit: TeamChecklistItemDto | null = habitItem
    ? {
        ...habitItem,
        targetDate: focus,
        kind: "drive",
        completedToday: Boolean(habitItem.completionsByDate[focus]),
        completedPlatformsToday: habitPlatformsToday,
        driveOutcome: parseDriveOutcome(habitPlatformsToday),
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
          const readyFrom = weekendPostDueYmd(targetDate);
          const publishDue = weekendPublishDueYmd(targetDate);
          const done = Boolean(item.completionsByDate[targetDate]);
          if (done) continue;
          // Creative window opens 4 days early, but don't clutter board until
          // publish-due day (or file is already Ready).
          if (focus < readyFrom) continue;
          if (readyFrom < overdueDueFloor) continue;
          if (focus > addDaysYmd(readyFrom, OVERDUE_LOOKBACK_DAYS)) continue;
          const row = applyHandoffToRow(
            {
              ...item,
              kind: "posts",
              outletId,
              outletTitle: outletKindTitle(outletId ?? postsList.title, "posts"),
              targetDate,
              dueLabel: weekendPostDueLabel(targetDate, focus),
              // Design (−4d 8 PM) or publish (day-before 11 PM) — never midnight-of-due-day
              isOverdue: isWeekendPostOverdue(targetDate, now),
            },
            targetDate
          );
          if (focus < publishDue && !isHandoffDownloadReady(row.handoff)) continue;
          allOpenPosts.push(row);
        }
        continue;
      }

      // Ad-hoc one-shot posts
      if (Object.keys(item.completionsByDate).length > 0) continue;
      allOpenPosts.push(
        applyHandoffToRow(
          {
            ...item,
            kind: "posts",
            outletId,
            outletTitle: outletKindTitle(outletId ?? postsList.title, "posts"),
            targetDate: focus,
          },
          focus
        )
      );
    }
  }
  allOpenPosts.sort((a, b) => {
    const ad = a.targetDate ?? "";
    const bd = b.targetDate ?? "";
    if (ad && bd && ad !== bd) return ad.localeCompare(bd);
    return a.sortOrder - b.sortOrder;
  });

  // Done list: completions from 6 days ago through next 7 days (covers night-before posts).
  const doneWindowStart = addDaysYmd(today, -6);
  const doneWindowEnd = addDaysYmd(today, 7);
  const doneSeen = new Set<string>();
  const doneItems: TeamChecklistItemDto[] = [];
  const pushDone = (row: TeamChecklistItemDto) => {
    const d = row.targetDate;
    if (!d || d < doneWindowStart || d > doneWindowEnd) return;
    const key = `${row.id}:${d}:${row.kind ?? ""}`;
    if (doneSeen.has(key)) return;
    doneSeen.add(key);
    doneItems.push({ ...row, isOverdue: false });
  };

  for (const list of storyLists) {
    for (const item of list.items) {
      if (!item.dayOfWeek || !isChecklistDayId(item.dayOfWeek)) continue;
      for (const date of Object.keys(item.completionsByDate)) {
        pushDone(
          applyHandoffToRow(
            {
              ...item,
              targetDate: date,
              dueLabel: storyDueLabel(date),
              outletId: list.outletId,
              outletTitle: outletKindTitle(list.outletId ?? list.title, "stories"),
              kind: "stories",
            },
            date
          )
        );
      }
    }
  }

  for (const list of adLists) {
    for (const item of list.items) {
      if (!item.dayOfWeek || !isWeekendPostDayId(item.dayOfWeek)) continue;
      for (const date of Object.keys(item.completionsByDate)) {
        pushDone(
          applyHandoffToRow(
            {
              ...item,
              targetDate: date,
              dueLabel: weekendPostDueLabel(date),
              outletId: list.outletId,
              outletTitle: outletKindTitle(list.outletId ?? list.title, "ads"),
              kind: "ads",
            },
            date
          )
        );
      }
    }
  }

  for (const postsList of postLists) {
    for (const item of postsList.items) {
      const fromChecklist = postsList.outletId;
      const fromDesc = outletIdFromPostText(item.description);
      const outletId = fromChecklist || fromDesc || null;
      for (const date of Object.keys(item.completionsByDate)) {
        pushDone(
          applyHandoffToRow(
            {
              ...item,
              kind: "posts",
              outletId,
              outletTitle: outletKindTitle(outletId ?? postsList.title, "posts"),
              targetDate: date,
              dueLabel: item.dayOfWeek ? weekendPostDueLabel(date) : undefined,
            },
            date
          )
        );
      }
    }
  }

  doneItems.sort((a, b) => (b.targetDate ?? "").localeCompare(a.targetDate ?? ""));

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

  const notesList = dtos.find(
    (c) => c.kind === "habits" && !c.outletId && c.title === BOARD_NOTES_CHECKLIST_TITLE
  );
  const boardNotes = notesList
    ? parseBoardNotesDescription(notesList.description)
    : { postings: "", ads: "", driveFolderUrl: "", driveFolders: [] };

  // Ready counts for today → +7 strip (go-live date), so Amit can jump ahead.
  const readyCountByDate: Record<string, number> = {};
  for (const wd of day.weekDays) {
    readyCountByDate[wd.date] = 0;
  }
  // Date-strip badges = Amit-ready stories/posts with a file (never ads).
  const bumpReady = (targetDate: string, item: TeamChecklistItemDto) => {
    if (!(targetDate in readyCountByDate)) return;
    if (item.completionsByDate[targetDate]) return;
    const h = handoffForDate(item.handoffByDate, item.readyDates, targetDate);
    if (!isHandoffDownloadReady(h)) return;
    readyCountByDate[targetDate] = (readyCountByDate[targetDate] ?? 0) + 1;
  };
  for (const list of dtos) {
    if (list.kind !== "stories" && list.kind !== "posts") continue;
    for (const item of list.items) {
      if (!item.dayOfWeek || !isChecklistDayId(item.dayOfWeek)) continue;
      for (const wd of day.weekDays) {
        if (wd.dayId !== item.dayOfWeek) continue;
        if (list.kind !== "stories" && !isWeekendPostDayId(item.dayOfWeek)) continue;
        bumpReady(wd.date, item);
      }
    }
  }

  return {
    day,
    enabledOutletIds,
    outlets,
    generalPosts,
    boardNotes,
    doneItems,
    overdueStories,
    focusStories,
    habit,
    openPosts: allOpenPosts,
    checklists: dtos,
    readyCountByDate,
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
