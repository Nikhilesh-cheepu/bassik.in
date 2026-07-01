import type {
  TeamAdTask,
  TeamCalendarEvent,
  TeamCalendarEventType,
  TeamPlanningNote,
} from "@prisma/client";
import type { TeamSession } from "@/lib/team-auth";
import { isTeamMemberId } from "@/lib/team-members";
import { isTeamOutletId } from "@/lib/team-outlets";
import { isAsapStartDate, teamTaskCompletedDayKey } from "@/lib/team-tasks";
import { parseSheetData } from "@/lib/team-planning";

export type CalendarEntryKind =
  | "TASK"
  | "TASK_DEADLINE"
  | "TASK_END"
  | "SHOOT"
  | "PLAN"
  | "MEETING"
  | "OTHER"
  | "LEGACY_PLAN";

export type TeamCalendarEntryDto = {
  id: string;
  date: string;
  endDate: string | null;
  title: string;
  subtitle: string | null;
  kind: CalendarEntryKind;
  outletId: string | null;
  source: "task" | "event" | "planning";
  sourceId: string;
  assigneeId?: string;
  status?: string;
};

export type TeamCalendarEventDto = {
  id: string;
  type: TeamCalendarEventType;
  title: string;
  description: string | null;
  date: string;
  endDate: string | null;
  outletId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type TeamCalendarShareDto = {
  id: string;
  title: string | null;
  dateKeys: string[];
  message: string | null;
  memberIds: string[];
  sharedBy: string;
  createdAt: string;
};

export const CALENDAR_KIND_LABELS: Record<CalendarEntryKind, string> = {
  TASK: "Ad task",
  TASK_DEADLINE: "Deadline",
  TASK_END: "Ad end",
  SHOOT: "Shoot",
  PLAN: "Plan",
  MEETING: "Meeting",
  OTHER: "Event",
  LEGACY_PLAN: "Plan",
};

export const CALENDAR_KIND_COLORS: Record<CalendarEntryKind, string> = {
  TASK: "bg-cyan-400",
  TASK_DEADLINE: "bg-amber-400",
  TASK_END: "bg-violet-400",
  SHOOT: "bg-rose-400",
  PLAN: "bg-emerald-400",
  MEETING: "bg-sky-400",
  OTHER: "bg-white/50",
  LEGACY_PLAN: "bg-emerald-400/80",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeCalendarDate(raw: string | null | undefined): string | null {
  const v = raw?.trim();
  if (!v || !ISO_DATE.test(v)) return null;
  const [y, m, d] = v.split("-").map(Number);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return v;
}

export function parseLooseCalendarDate(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (ISO_DATE.test(v)) return normalizeCalendarDate(v);
  const dmy = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10);
    let year = parseInt(dmy[3], 10);
    if (year < 100) year += 2000;
    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return normalizeCalendarDate(key);
  }
  const parsed = new Date(v);
  if (!Number.isNaN(parsed.getTime())) {
    const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
    return normalizeCalendarDate(key);
  }
  return null;
}

export function monthBounds(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

export function expandDateSpan(date: string, endDate: string | null | undefined): string[] {
  const start = normalizeCalendarDate(date);
  if (!start) return [];
  const end = normalizeCalendarDate(endDate ?? date) ?? start;
  if (end < start) return [start];
  const out: string[] = [];
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const cursor = new Date(sy, sm - 1, sd);
  const limit = new Date(ey, em - 1, ed);
  while (cursor <= limit) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    out.push(key);
    cursor.setDate(cursor.getDate() + 1);
    if (out.length > 62) break;
  }
  return out;
}

export function dateInRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

export function entryTouchesRange(entry: TeamCalendarEntryDto, from: string, to: string): boolean {
  const end = entry.endDate && entry.endDate >= entry.date ? entry.endDate : entry.date;
  return entry.date <= to && end >= from;
}

export function parseDateKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const d = normalizeCalendarDate(item);
    if (d && !seen.has(d)) {
      seen.add(d);
      out.push(d);
    }
  }
  return out.sort();
}

export function toTeamCalendarEventDto(row: TeamCalendarEvent): TeamCalendarEventDto {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    date: row.date,
    endDate: row.endDate,
    outletId: row.outletId,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function eventKindFromType(type: TeamCalendarEventType): CalendarEntryKind {
  if (type === "SHOOT") return "SHOOT";
  if (type === "PLAN") return "PLAN";
  if (type === "MEETING") return "MEETING";
  return "OTHER";
}

export function entriesFromCalendarEvent(row: TeamCalendarEvent): TeamCalendarEntryDto[] {
  const kind = eventKindFromType(row.type);
  const days = expandDateSpan(row.date, row.endDate);
  if (!days.length) return [];
  return days.map((date, i) => ({
    id: `event:${row.id}:${date}`,
    date,
    endDate: row.endDate,
    title: row.title,
    subtitle: row.description,
    kind,
    outletId: row.outletId,
    source: "event",
    sourceId: row.id,
  }));
}

export function entriesFromAdTask(task: TeamAdTask): TeamCalendarEntryDto[] {
  const entries: TeamCalendarEntryDto[] = [];
  const asap = isAsapStartDate(task.startDate);
  const base = {
    outletId: task.outletId,
    source: "task" as const,
    sourceId: task.id,
    assigneeId: task.assigneeId,
    status: task.status,
  };

  if (asap) {
    const d = teamTaskCompletedDayKey(task.createdAt);
    if (d !== "unknown") {
      entries.push({
        id: `task:${task.id}:created:${d}`,
        date: d,
        endDate: null,
        title: task.title,
        subtitle: "ASAP",
        kind: "TASK",
        ...base,
      });
    }
  } else if (task.startDate) {
    const d = normalizeCalendarDate(task.startDate);
    if (d) {
      entries.push({
        id: `task:${task.id}:start:${d}`,
        date: d,
        endDate: null,
        title: task.title,
        subtitle: "Ad start",
        kind: "TASK",
        ...base,
      });
    }
  }

  if (task.endDate && !asap) {
    const d = normalizeCalendarDate(task.endDate);
    if (d) {
      entries.push({
        id: `task:${task.id}:end:${d}`,
        date: d,
        endDate: null,
        title: task.title,
        subtitle: task.endTime ? `Ad ends · ${task.endTime}` : "Ad end",
        kind: "TASK_END",
        ...base,
      });
    }
  }

  if (task.deadlineDate) {
    const d = normalizeCalendarDate(task.deadlineDate);
    if (d) {
      entries.push({
        id: `task:${task.id}:deadline:${d}`,
        date: d,
        endDate: null,
        title: task.title,
        subtitle: task.deadlineTime ? `Due · ${task.deadlineTime}` : "Deadline",
        kind: "TASK_DEADLINE",
        ...base,
      });
    }
  }

  return entries;
}

export function entriesFromPlanningNote(note: TeamPlanningNote): TeamCalendarEntryDto[] {
  const sheet = parseSheetData(note.sheetData);
  if (!sheet) return [];
  const dateCol = sheet.columns.findIndex((c) => c.toLowerCase() === "date");
  if (dateCol < 0) return [];
  const itemCol = sheet.columns.findIndex((c) => c.toLowerCase() === "item");
  const entries: TeamCalendarEntryDto[] = [];

  sheet.rows.forEach((row, rowIdx) => {
    const dateRaw = row[dateCol] ?? "";
    const date = parseLooseCalendarDate(dateRaw);
    if (!date) return;
    const item = itemCol >= 0 ? row[itemCol]?.trim() : "";
    entries.push({
      id: `planning:${note.id}:${rowIdx}:${date}`,
      date,
      endDate: null,
      title: item || note.title,
      subtitle: note.title,
      kind: "LEGACY_PLAN",
      outletId: note.outletId,
      source: "planning",
      sourceId: note.id,
    });
  });

  return entries;
}

export function calendarViewerId(session: TeamSession): string {
  if (session.role === "admin") return "admin";
  return session.memberId ?? session.username;
}

export function canManageCalendarEvents(session: TeamSession): boolean {
  return session.role === "admin";
}

export function parseCalendarEventType(raw: string | null | undefined): TeamCalendarEventType {
  const v = raw?.trim().toUpperCase();
  if (v === "SHOOT" || v === "PLAN" || v === "MEETING" || v === "OTHER") return v;
  return "PLAN";
}

export function parseCalendarEventPayload(body: Record<string, unknown>) {
  const type = parseCalendarEventType(typeof body.type === "string" ? body.type : undefined);
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim().slice(0, 2000)
      : null;
  const date = normalizeCalendarDate(typeof body.date === "string" ? body.date : "");
  const endDate = normalizeCalendarDate(typeof body.endDate === "string" ? body.endDate : "");
  const outletRaw = typeof body.outletId === "string" ? body.outletId.trim() : "";
  const outletId = outletRaw && isTeamOutletId(outletRaw) ? outletRaw : null;
  return { type, title, description, date, endDate, outletId };
}

export function parseShareMemberIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((id): id is string => typeof id === "string" && isTeamMemberId(id)))];
}

export type BuildCalendarOpts = {
  from: string;
  to: string;
  session: TeamSession;
  sharedDateKeys: Set<string>;
  tasks: TeamAdTask[];
  events: TeamCalendarEvent[];
  planningNotes: TeamPlanningNote[];
  outletId?: string;
  kinds?: CalendarEntryKind[];
};

export function buildCalendarEntries(opts: BuildCalendarOpts): TeamCalendarEntryDto[] {
  const isAdmin = opts.session.role === "admin";
  const memberId = opts.session.memberId ?? opts.session.username;

  const raw: TeamCalendarEntryDto[] = [];

  for (const task of opts.tasks) {
    raw.push(...entriesFromAdTask(task));
  }
  for (const ev of opts.events) {
    raw.push(...entriesFromCalendarEvent(ev));
  }
  for (const note of opts.planningNotes) {
    raw.push(...entriesFromPlanningNote(note));
  }

  let filtered = raw.filter((e) => entryTouchesRange(e, opts.from, opts.to));

  if (opts.outletId) {
    filtered = filtered.filter((e) => !e.outletId || e.outletId === opts.outletId);
  }

  if (!isAdmin) {
    filtered = filtered.filter((e) => {
      if (e.source === "task") {
        return e.assigneeId === memberId;
      }
      if (e.source === "event" || e.source === "planning") {
        return opts.sharedDateKeys.has(e.date);
      }
      return false;
    });
  }

  if (opts.kinds?.length) {
    const set = new Set(opts.kinds);
    filtered = filtered.filter((e) => set.has(e.kind));
  }

  filtered.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return a.title.localeCompare(b.title);
  });

  return filtered;
}

export function groupEntriesByDate(entries: TeamCalendarEntryDto[]): Record<string, TeamCalendarEntryDto[]> {
  const map: Record<string, TeamCalendarEntryDto[]> = {};
  for (const e of entries) {
    if (!map[e.date]) map[e.date] = [];
    map[e.date].push(e);
  }
  return map;
}

export function calendarWeekdayLabels(): string[] {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
}

export function calendarMonthCells(year: number, month: number): (string | null)[] {
  const first = new Date(year, month - 1, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
