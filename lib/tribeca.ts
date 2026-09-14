export const SHOOT_CATEGORIES = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "ambience", label: "Ambience" },
  { id: "dinner", label: "Dinner" },
  { id: "live_sessions", label: "Live sessions" },
  { id: "workshops", label: "Workshops" },
] as const;

export type ShootCategoryId = (typeof SHOOT_CATEGORIES)[number]["id"];

export const CREDENTIAL_SEED = [
  { itemKey: "ig_access", label: "Instagram login / access", sortOrder: 1 },
  { itemKey: "meta_access", label: "Meta Business / Ads access", sortOrder: 2 },
  { itemKey: "gmb_access", label: "Google Business Profile access", sortOrder: 3 },
  { itemKey: "yt_access", label: "YouTube channel access", sortOrder: 4 },
  { itemKey: "drive_assets", label: "Drive / brand assets shared", sortOrder: 5 },
] as const;

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

export function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    creative_pending: "Creative pending",
    shoot: "Shoot",
    production: "Production",
    pending: "Pending",
    done: "Done",
  };
  return map[stage] ?? stage;
}

export function currentYearMonth(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatYearMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return yearMonth;
  return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

export function daysInMonth(yearMonth: string): number {
  const [y, m] = yearMonth.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function monthGridStartWeekday(yearMonth: string): number {
  const [y, m] = yearMonth.split("-").map(Number);
  return new Date(y, m - 1, 1).getDay(); // 0 Sun
}

export function dateKey(yearMonth: string, day: number): string {
  return `${yearMonth}-${String(day).padStart(2, "0")}`;
}

export function computeShootCategoryProgress(
  items: { kind: string; category: string | null; stage: string }[]
): { id: string; label: string; total: number; done: number }[] {
  return SHOOT_CATEGORIES.map((cat) => {
    const inCat = items.filter((i) => i.kind === "shoot" && i.category === cat.id);
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
