import type { TeamContentFile, TeamContentEditStatus, TeamContentFileKind } from "@prisma/client";
import type { TeamSession } from "@/lib/team-auth";
import { isTeamOutletId, teamOutletLabel } from "@/lib/team-outlets";
import { normalizeCalendarDate } from "@/lib/team-calendar";
import { shootOwnerId, canEditShoot } from "@/lib/team-shoots";

export type TeamContentFileDto = {
  id: string;
  ownerId: string;
  kind: TeamContentFileKind;
  title: string | null;
  displayTitle: string;
  driveLink: string | null;
  notes: string | null;
  outletId: string | null;
  outletLabel: string | null;
  shootDate: string | null;
  shootId: string | null;
  editStatus: TeamContentEditStatus;
  editStatusLabel: string;
  isOwner: boolean;
  canEdit: boolean;
  createdAt: string;
  updatedAt: string;
};

const EDIT_STATUS_LABELS: Record<TeamContentEditStatus, string> = {
  TO_EDIT: "To edit",
  EDITED: "Edited",
};

function parseDriveUrl(raw: string | null | undefined): string | null {
  const v = raw?.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) return null;
  return v.slice(0, 2000);
}

export function contentFileDisplayTitle(row: Pick<TeamContentFile, "title">): string {
  if (row.title?.trim()) return row.title.trim();
  return "Untitled";
}

export function canAccessContentFiles(session: TeamSession): boolean {
  return session.role !== "viewer";
}

export function canEditContentFile(session: TeamSession, ownerId: string): boolean {
  return canEditShoot(session, ownerId);
}

export function canCreateContentFiles(session: TeamSession): boolean {
  return session.role === "admin" || session.role === "content";
}

export function parseContentFileKind(raw: unknown): TeamContentFileKind | null {
  return raw === "RAW" || raw === "raw" ? "RAW" : raw === "EDIT" || raw === "edit" ? "EDIT" : null;
}

export function parseEditStatus(raw: unknown): TeamContentEditStatus {
  return raw === "EDITED" || raw === "edited" ? "EDITED" : "TO_EDIT";
}

export function parseContentFilePayload(body: Record<string, unknown>) {
  const kind = parseContentFileKind(body.kind);
  const title =
    typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 200) : null;
  const notes =
    typeof body.notes === "string" && body.notes.trim() ? body.notes.trim().slice(0, 5000) : null;
  const driveLink = parseDriveUrl(typeof body.driveLink === "string" ? body.driveLink : null);
  const outletRaw = typeof body.outletId === "string" ? body.outletId.trim() : "";
  const outletId = outletRaw && isTeamOutletId(outletRaw) ? outletRaw : null;
  const shootDate = normalizeCalendarDate(typeof body.shootDate === "string" ? body.shootDate : "");
  const shootId = typeof body.shootId === "string" && body.shootId.trim() ? body.shootId.trim() : null;
  const editStatus = parseEditStatus(body.editStatus);
  return { kind, title, notes, driveLink, outletId, shootDate, shootId, editStatus };
}

export function toTeamContentFileDto(
  row: TeamContentFile,
  viewerOwnerId: string,
  session: TeamSession
): TeamContentFileDto {
  const isOwner = row.ownerId === viewerOwnerId;
  return {
    id: row.id,
    ownerId: row.ownerId,
    kind: row.kind,
    title: row.title,
    displayTitle: contentFileDisplayTitle(row),
    driveLink: row.driveLink,
    notes: row.notes,
    outletId: row.outletId,
    outletLabel: row.outletId ? teamOutletLabel(row.outletId) : null,
    shootDate: row.shootDate,
    shootId: row.shootId,
    editStatus: row.editStatus,
    editStatusLabel: EDIT_STATUS_LABELS[row.editStatus],
    isOwner,
    canEdit: canEditContentFile(session, row.ownerId),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function filterContentFilesForViewer(
  rows: TeamContentFile[],
  session: TeamSession,
  viewerOwnerId: string
): TeamContentFile[] {
  if (session.role === "admin") return rows;
  return rows.filter((row) => row.ownerId === viewerOwnerId);
}
