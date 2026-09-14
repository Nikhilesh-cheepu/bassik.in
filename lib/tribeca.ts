export const SHOOT_CATEGORIES = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "ambience", label: "Ambience" },
  { id: "dinner", label: "Dinner" },
] as const;

export const EVENT_CATEGORIES = [
  { id: "live_sessions", label: "Live sessions" },
  { id: "workshops", label: "Workshops" },
] as const;

/** Progress chips at top — shoots + event types. */
export const PROGRESS_CATEGORIES = [...SHOOT_CATEGORIES, ...EVENT_CATEGORIES] as const;

export type ShootCategoryId = (typeof SHOOT_CATEGORIES)[number]["id"];
export type EventCategoryId = (typeof EVENT_CATEGORIES)[number]["id"];

export const CREDENTIAL_SEED = [
  { itemKey: "instagram", label: "Instagram access", sortOrder: 1 },
  { itemKey: "facebook", label: "Facebook access", sortOrder: 2 },
  { itemKey: "google_business", label: "Google Business access", sortOrder: 3 },
  { itemKey: "youtube", label: "YouTube channel access", sortOrder: 4 },
] as const;

export const ACCESS_CREDENTIAL_KEYS = new Set<string>([
  "instagram",
  "facebook",
  "google_business",
  "youtube",
]);

export function categoryLabel(kind: string, category: string | null | undefined): string | null {
  if (!category) return null;
  if (kind === "event") {
    return EVENT_CATEGORIES.find((c) => c.id === category)?.label ?? category;
  }
  return SHOOT_CATEGORIES.find((c) => c.id === category)?.label ?? category;
}

export function itemListLabel(item: { kind: string; category: string | null; title: string }): string {
  const cat = categoryLabel(item.kind, item.category);
  if (item.kind === "shoot") {
    return cat ? `${cat} shoot · ${item.title}` : `Shoot · ${item.title}`;
  }
  if (item.kind === "event") {
    return cat ? `${cat} · ${item.title}` : `Event · ${item.title}`;
  }
  return item.title;
}

/** event: creative pending → done */
export const EVENT_STAGES = ["creative_pending", "done"] as const;
/** shoot: shoot → production (editing) → done */
export const SHOOT_STAGES = ["shoot", "production", "done"] as const;
export const OTHER_STAGES = ["pending", "done"] as const;

export type CalendarKind = "shoot" | "event" | "other";

export function defaultStageForKind(kind: CalendarKind): string {
  if (kind === "shoot") return "shoot";
  if (kind === "event") return "creative_pending";
  return "pending";
}

export function stagesForKind(kind: CalendarKind): readonly string[] {
  if (kind === "shoot") return SHOOT_STAGES;
  if (kind === "event") return EVENT_STAGES;
  return OTHER_STAGES;
}

export function nextStageForKind(kind: CalendarKind, stage: string): string {
  const stages = stagesForKind(kind);
  const idx = stages.indexOf(stage);
  if (idx < 0 || idx >= stages.length - 1) return "done";
  return stages[idx + 1];
}

export function stageLabel(stage: string, kind?: string): string {
  if (kind === "event") {
    if (stage === "creative_pending") return "Creative pending";
    if (stage === "done") return "Creative done";
  }
  if (kind === "shoot") {
    if (stage === "shoot") return "Shoot";
    if (stage === "production") return "Editing";
    if (stage === "done") return "Done";
  }
  const map: Record<string, string> = {
    creative_pending: "Creative pending",
    shoot: "Shoot",
    production: "Editing",
    pending: "Pending",
    done: "Done",
  };
  return map[stage] ?? stage;
}

export function nextStageLabel(kind: CalendarKind, stage: string): string | null {
  const stages = stagesForKind(kind);
  const idx = stages.indexOf(stage);
  if (idx < 0 || idx >= stages.length - 1) return null;
  return stageLabel(stages[idx + 1], kind);
}

/** Password required only when moving a todo stage backward. */
export const TRIBECA_STAGE_BACK_PASSWORD = "7013";

export function isStageBackward(kind: CalendarKind, fromStage: string, toStage: string): boolean {
  const stages = stagesForKind(kind);
  const from = stages.indexOf(fromStage);
  const to = stages.indexOf(toStage);
  if (from < 0 || to < 0) return false;
  return to < from;
}

/** Calendar dates always use India (Asia/Kolkata), not the server/browser local zone alone. */
export const TRIBECA_TZ = "Asia/Kolkata";

/** YYYY-MM-DD for a moment in India time. */
export function toDateKey(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TRIBECA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function currentYearMonth(d = new Date()): string {
  return toDateKey(d).slice(0, 7);
}

export function formatYearMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return yearMonth;
  return new Date(y, m - 1, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: TRIBECA_TZ,
  });
}

/** Parse YYYY-MM-DD as a pure calendar day (noon UTC avoids DST edge cases). */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export function addDaysToDateKey(key: string, delta: number): string {
  const d = parseDateKey(key);
  d.setUTCDate(d.getUTCDate() + delta);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Vertical list: past → today → future (scroll so today sits at the top). */
export function buildDateStrip(centerKey = toDateKey(), pastDays = 45, futureDays = 90): string[] {
  const keys: string[] = [];
  for (let i = -pastDays; i <= futureDays; i++) {
    keys.push(addDaysToDateKey(centerKey, i));
  }
  return keys;
}

export function formatStripDay(key: string): {
  weekday: string;
  day: string;
  month: string;
  label: string;
} {
  const d = parseDateKey(key);
  return {
    weekday: d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }),
    day: String(Number(key.slice(8, 10))),
    month: d.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }),
    label: d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
  };
}

export function yearMonthFromDateKey(key: string): string {
  return key.slice(0, 7);
}

export function computeShootCategoryProgress(
  items: { kind: string; category: string | null; stage: string }[]
): { id: string; label: string; total: number; done: number }[] {
  return PROGRESS_CATEGORIES.map((cat) => {
    const isEventCat = EVENT_CATEGORIES.some((e) => e.id === cat.id);
    const inCat = items.filter(
      (i) =>
        i.category === cat.id &&
        (isEventCat ? i.kind === "event" : i.kind === "shoot")
    );
    return {
      id: cat.id,
      label: cat.label,
      total: inCat.length,
      done: inCat.filter((i) => i.stage === "done").length,
    };
  });
}

export function computeBudgetTotals(entries: { type: string; amountInr: number | string }[]) {
  let added = 0;
  let used = 0;
  for (const e of entries) {
    const n = typeof e.amountInr === "string" ? Number(e.amountInr) : Number(e.amountInr);
    if (!Number.isFinite(n)) continue;
    if (e.type === "add") added += n;
    else if (e.type === "use") used += n;
  }
  return { added, used, remaining: added - used };
}

export function normalizeCredentialStatus(status: string): "pending" | "done" {
  return status === "done" ? "done" : "pending";
}
