import type { TeamDriveLink } from "@prisma/client";
import type { TeamSession } from "@/lib/team-auth";
import { teamMemberName } from "@/lib/team-members";
import { teamReminderOwnerId } from "@/lib/team-reminders";

export type TeamDriveLinkDto = {
  id: string;
  ownerId: string;
  ownerLabel: string;
  title: string;
  url: string;
  description: string | null;
  isOwner: boolean;
  canEdit: boolean;
  createdAt: string;
  updatedAt: string;
};

export function canAccessDriveLinks(session: TeamSession): boolean {
  return session.role !== "viewer";
}

export function canCreateDriveLinks(session: TeamSession): boolean {
  return session.role !== "viewer";
}

export function driveLinkOwnerId(session: TeamSession): string {
  return teamReminderOwnerId(session);
}

export function canEditDriveLink(session: TeamSession, ownerId: string): boolean {
  return session.role === "admin" || driveLinkOwnerId(session) === ownerId;
}

export function driveLinkOwnerLabel(ownerId: string): string {
  if (ownerId === "admin") return "Admin";
  return teamMemberName(ownerId);
}

export function parseDriveLinkTitle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const title = raw.trim();
  if (!title) return null;
  return title.slice(0, 200);
}

export function parseDriveLinkDescription(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const description = raw.trim();
  if (!description) return null;
  return description.slice(0, 5000);
}

export function parseDriveLinkUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let value = raw.trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!parsed.hostname) return null;
    return parsed.toString().slice(0, 2000);
  } catch {
    return null;
  }
}

export function formatDriveLinkStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function toTeamDriveLinkDto(
  row: TeamDriveLink,
  session: TeamSession
): TeamDriveLinkDto {
  const viewerOwnerId = driveLinkOwnerId(session);
  const isOwner = row.ownerId === viewerOwnerId;
  return {
    id: row.id,
    ownerId: row.ownerId,
    ownerLabel: driveLinkOwnerLabel(row.ownerId),
    title: row.title,
    url: row.url,
    description: row.description,
    isOwner,
    canEdit: canEditDriveLink(session, row.ownerId),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
