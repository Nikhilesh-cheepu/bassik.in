import type { TeamTaskPriority } from "@prisma/client";

export const TEAM_PRIORITIES: TeamTaskPriority[] = ["HIGH", "NORMAL", "LOW"];

export const TEAM_PRIORITY_LABELS: Record<TeamTaskPriority, string> = {
  HIGH: "High",
  NORMAL: "Normal",
  LOW: "Low",
};

export function normalizeTeamPriority(raw: string | null | undefined): TeamTaskPriority {
  const v = raw?.trim().toUpperCase();
  if (v === "HIGH" || v === "LOW" || v === "NORMAL") return v;
  return "NORMAL";
}

export function priorityRank(p: TeamTaskPriority): number {
  switch (p) {
    case "HIGH":
      return 0;
    case "NORMAL":
      return 1;
    case "LOW":
      return 2;
  }
}

export function priorityAccentClass(p: TeamTaskPriority, done: boolean): string {
  if (done) return "bg-emerald-500/70";
  switch (p) {
    case "HIGH":
      return "bg-rose-500";
    case "LOW":
      return "bg-slate-500/60";
    default:
      return "bg-cyan-500/50";
  }
}

export function cyclePriority(p: TeamTaskPriority): TeamTaskPriority {
  if (p === "HIGH") return "NORMAL";
  if (p === "NORMAL") return "LOW";
  return "HIGH";
}
