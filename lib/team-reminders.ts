import type { TeamAdTaskStatus, TeamReminder } from "@prisma/client";
import type { TeamSession } from "@/lib/team-auth";
import { normalizeTeamEndTime } from "@/lib/team-end-time";

export type TeamReminderDto = {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  deadlineDate: string | null;
  deadlineTime: string | null;
  status: TeamAdTaskStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function teamReminderOwnerId(session: TeamSession): string {
  if (session.role === "admin") return "admin";
  return session.memberId ?? session.username;
}

export function toTeamReminderDto(row: TeamReminder): TeamReminderDto {
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    description: row.description,
    startDate: row.startDate,
    endDate: row.endDate,
    deadlineDate: row.deadlineDate,
    deadlineTime: row.deadlineTime,
    status: row.status,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type TeamReminderFilter = "all" | "todo" | "done";

export function filterTeamReminders(
  rows: TeamReminder[],
  filter: TeamReminderFilter
): TeamReminder[] {
  switch (filter) {
    case "todo":
      return rows.filter((r) => r.status === "TODO");
    case "done":
      return rows.filter((r) => r.status === "DONE");
    default:
      return rows;
  }
}

export function normalizeReminderDate(raw: string | null | undefined): string | null {
  const v = raw?.trim() ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export function parseReminderPayload(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim().slice(0, 2000)
      : null;
  const startDate = normalizeReminderDate(
    typeof body.startDate === "string" ? body.startDate : null
  );
  const endDate = normalizeReminderDate(typeof body.endDate === "string" ? body.endDate : null);
  const deadlineDate = normalizeReminderDate(
    typeof body.deadlineDate === "string" ? body.deadlineDate : null
  );
  const deadlineTime = normalizeTeamEndTime(
    typeof body.deadlineTime === "string" ? body.deadlineTime : null
  );
  return { title, description, startDate, endDate, deadlineDate, deadlineTime };
}
