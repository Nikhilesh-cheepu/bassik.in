import type { TeamShoot, TeamShootNoteLink, TeamShootShare, TeamPersonalNote } from "@prisma/client";
import type { TeamSession } from "@/lib/team-auth";
import { isTeamMemberId, teamMemberName } from "@/lib/team-members";
import { isTeamOutletId, teamOutletLabel } from "@/lib/team-outlets";
import { normalizeCalendarDate } from "@/lib/team-calendar";
import { noteDisplayTitle } from "@/lib/team-personal-notes";

export type TeamShootNoteLinkDto = {
  id: string;
  noteId: string;
  title: string;
  bodyPreview: string;
  addedBy: string;
  addedByLabel: string;
};

export type TeamShootDto = {
  id: string;
  ownerId: string;
  ownerLabel: string;
  shootDate: string;
  outletId: string | null;
  outletLabel: string | null;
  title: string | null;
  displayTitle: string;
  shootNotes: string | null;
  rawFilesDriveLink: string | null;
  editFilesDriveLink: string | null;
  linkedNotes: TeamShootNoteLinkDto[];
  sharedWith: string[];
  sharedWithLabels: string[];
  isOwner: boolean;
  canEdit: boolean;
  createdAt: string;
  updatedAt: string;
};

export function shootOwnerId(session: TeamSession): string {
  if (session.role === "admin") return "admin";
  return session.memberId ?? session.username;
}

export function canCreateShoots(session: TeamSession): boolean {
  return session.role === "admin" || session.role === "content";
}

export function canEditShoot(session: TeamSession, ownerId: string): boolean {
  if (session.role === "admin") return true;
  if (session.role !== "content") return false;
  return ownerId === shootOwnerId(session);
}

export function canAccessShootsTab(session: TeamSession): boolean {
  return session.role !== "viewer";
}

function parseDriveUrl(raw: string | null | undefined): string | null {
  const v = raw?.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) return null;
  return v.slice(0, 2000);
}

export function parseShootPayload(body: Record<string, unknown>) {
  const shootDate = normalizeCalendarDate(typeof body.shootDate === "string" ? body.shootDate : "");
  const outletRaw = typeof body.outletId === "string" ? body.outletId.trim() : "";
  const outletId = outletRaw && isTeamOutletId(outletRaw) ? outletRaw : null;
  const title =
    typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 200) : null;
  const shootNotes =
    typeof body.shootNotes === "string" && body.shootNotes.trim()
      ? body.shootNotes.trim().slice(0, 5000)
      : null;
  const rawFilesDriveLink = parseDriveUrl(
    typeof body.rawFilesDriveLink === "string" ? body.rawFilesDriveLink : null
  );
  const editFilesDriveLink = parseDriveUrl(
    typeof body.editFilesDriveLink === "string" ? body.editFilesDriveLink : null
  );
  return { shootDate, outletId, title, shootNotes, rawFilesDriveLink, editFilesDriveLink };
}

export function parseShootShareMemberIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((id): id is string => typeof id === "string" && isTeamMemberId(id)))];
}

type ShootWithRelations = TeamShoot & {
  noteLinks?: (TeamShootNoteLink & { note?: TeamPersonalNote })[];
  shares?: TeamShootShare[];
};

export function shootDisplayTitle(row: Pick<TeamShoot, "title" | "outletId" | "shootDate">): string {
  if (row.title?.trim()) return row.title.trim();
  const outlet = row.outletId ? teamOutletLabel(row.outletId) : "Shoot";
  return `${outlet} · ${row.shootDate}`;
}

export function toTeamShootDto(
  row: ShootWithRelations,
  viewerOwnerId: string,
  session: TeamSession
): TeamShootDto {
  const shares = row.shares ?? [];
  const sharedWith = shares.map((s) => s.memberId);
  const isOwner = row.ownerId === viewerOwnerId;
  const linkedNotes = (row.noteLinks ?? []).map((link) => ({
    id: link.id,
    noteId: link.noteId,
    title: link.note ? noteDisplayTitle(link.note) : "Note",
    bodyPreview: link.note?.body?.slice(0, 120) ?? "",
    addedBy: link.addedBy,
    addedByLabel: link.addedBy === "admin" ? "Admin" : teamMemberName(link.addedBy),
  }));

  return {
    id: row.id,
    ownerId: row.ownerId,
    ownerLabel: row.ownerId === "admin" ? "Admin" : teamMemberName(row.ownerId),
    shootDate: row.shootDate,
    outletId: row.outletId,
    outletLabel: row.outletId ? teamOutletLabel(row.outletId) : null,
    title: row.title,
    displayTitle: shootDisplayTitle(row),
    shootNotes: row.shootNotes,
    rawFilesDriveLink: row.rawFilesDriveLink,
    editFilesDriveLink: row.editFilesDriveLink,
    linkedNotes,
    sharedWith,
    sharedWithLabels: sharedWith.map((id) => teamMemberName(id)),
    isOwner,
    canEdit: canEditShoot(session, row.ownerId),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function filterShootsForViewer(
  rows: ShootWithRelations[],
  session: TeamSession,
  viewerOwnerId: string
): ShootWithRelations[] {
  if (session.role === "admin") return rows;
  const memberId = session.memberId ?? session.username;
  return rows.filter((row) => {
    if (row.ownerId === viewerOwnerId) return true;
    return (row.shares ?? []).some((s) => s.memberId === memberId);
  });
}

export function groupShootsByDate(shoots: TeamShootDto[]): Record<string, TeamShootDto[]> {
  const map: Record<string, TeamShootDto[]> = {};
  for (const s of shoots) {
    if (!map[s.shootDate]) map[s.shootDate] = [];
    map[s.shootDate].push(s);
  }
  return map;
}

export function buildShootShareText(shoot: TeamShootDto): string {
  const lines = [
    `Shoot — ${shoot.displayTitle}`,
    shoot.outletLabel ? `Outlet: ${shoot.outletLabel}` : null,
    `Date: ${shoot.shootDate}`,
    shoot.shootNotes ? `\nNotes:\n${shoot.shootNotes}` : null,
    shoot.rawFilesDriveLink ? `\nRaw files: ${shoot.rawFilesDriveLink}` : null,
    shoot.editFilesDriveLink ? `Edit files: ${shoot.editFilesDriveLink}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export const SHOOT_INCLUDE = {
  noteLinks: { include: { note: true }, orderBy: { createdAt: "asc" as const } },
  shares: true,
} as const;
