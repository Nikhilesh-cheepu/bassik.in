import type { TeamPersonalNote } from "@prisma/client";
import type { TeamSession } from "@/lib/team-auth";
import { teamReminderOwnerId } from "@/lib/team-reminders";

export type TeamPersonalNoteDto = {
  id: string;
  ownerId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export function teamPersonalNoteOwnerId(session: TeamSession): string {
  return teamReminderOwnerId(session);
}

export function toTeamPersonalNoteDto(row: TeamPersonalNote): TeamPersonalNoteDto {
  return {
    id: row.id,
    ownerId: row.ownerId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function formatPersonalNoteTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function parsePersonalNoteBody(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const body = raw.trim();
  if (!body) return null;
  if (body.length > 20000) return null;
  return body;
}
