import { prisma } from "@/lib/db";
import {
  DESIGNER_PERFORMANCE_IDS,
  type DesignerDoneAdjustmentDto,
} from "@/lib/team-designer-jobs-shared";

export const DESIGNER_DONE_ADJUST_MIN = -4;
export const DESIGNER_DONE_ADJUST_MAX = 4;

export function clampDesignerDoneDelta(n: unknown): number | null {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v) || !Number.isInteger(v)) return null;
  if (v < DESIGNER_DONE_ADJUST_MIN || v > DESIGNER_DONE_ADJUST_MAX) return null;
  if (v === 0) return null;
  return v;
}

function rowToDto(row: {
  id: string;
  assigneeId: string;
  creditDate: string;
  delta: number;
  note: string | null;
  createdBy: string;
  createdAt: Date;
}): DesignerDoneAdjustmentDto {
  return {
    id: row.id,
    assigneeId: row.assigneeId,
    creditDate: row.creditDate,
    delta: row.delta,
    note: row.note,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Sum of manual deltas per day in range. */
export async function loadDoneAdjustmentsByDay(
  assigneeId: string,
  fromYmd: string,
  toYmd: string
): Promise<Map<string, number>> {
  const rows = await prisma.teamDesignerDoneAdjustment.findMany({
    where: {
      assigneeId,
      creditDate: { gte: fromYmd, lte: toYmd },
    },
    select: { creditDate: true, delta: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.creditDate, (map.get(r.creditDate) ?? 0) + r.delta);
  }
  return map;
}

/** Apply manual credits onto a day → closed count map (never below 0). */
export function mergeDoneAdjustmentsIntoMap(
  base: Map<string, number>,
  adjustments: Map<string, number>
): void {
  for (const [ymd, delta] of adjustments) {
    if (!delta) continue;
    base.set(ymd, Math.max(0, (base.get(ymd) ?? 0) + delta));
  }
}

export async function listDesignerDoneAdjustments(opts: {
  assigneeId: string;
  fromYmd: string;
  toYmd: string;
  limit?: number;
}): Promise<DesignerDoneAdjustmentDto[]> {
  const rows = await prisma.teamDesignerDoneAdjustment.findMany({
    where: {
      assigneeId: opts.assigneeId,
      creditDate: { gte: opts.fromYmd, lte: opts.toYmd },
    },
    orderBy: [{ createdAt: "desc" }],
    take: opts.limit ?? 20,
  });
  return rows.map(rowToDto);
}

export async function createDesignerDoneAdjustment(params: {
  assigneeId: string;
  creditDate: string;
  delta: number;
  note?: string | null;
  createdBy: string;
}): Promise<DesignerDoneAdjustmentDto> {
  if (
    !DESIGNER_PERFORMANCE_IDS.includes(
      params.assigneeId as (typeof DESIGNER_PERFORMANCE_IDS)[number]
    )
  ) {
    throw new Error("Invalid designer");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.creditDate)) {
    throw new Error("Invalid date");
  }
  const delta = clampDesignerDoneDelta(params.delta);
  if (delta === null) {
    throw new Error(`Use ${DESIGNER_DONE_ADJUST_MIN} to ${DESIGNER_DONE_ADJUST_MAX} (not 0)`);
  }
  const row = await prisma.teamDesignerDoneAdjustment.create({
    data: {
      assigneeId: params.assigneeId,
      creditDate: params.creditDate,
      delta,
      note: params.note?.trim() || null,
      createdBy: params.createdBy,
    },
  });
  return rowToDto(row);
}

export async function deleteDesignerDoneAdjustment(id: string): Promise<boolean> {
  try {
    await prisma.teamDesignerDoneAdjustment.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}
