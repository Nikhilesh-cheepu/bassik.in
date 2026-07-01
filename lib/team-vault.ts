import type { TeamVaultEntry, TeamVaultShare } from "@prisma/client";
import type { TeamSession } from "@/lib/team-auth";
import { isTeamMemberId, teamMemberName } from "@/lib/team-members";
import { isTeamOutletId } from "@/lib/team-outlets";
import { teamPersonalNoteOwnerId, formatNoteListDate, linkDisplayLabel } from "@/lib/team-personal-notes";

export type TeamVaultEntryDto = {
  id: string;
  ownerId: string;
  ownerLabel: string;
  title: string | null;
  username: string | null;
  url: string | null;
  notes: string | null;
  outletId: string | null;
  category: string | null;
  isOwner: boolean;
  sharedWith: string[];
  sharedWithLabels: string[];
  sharedBy: string | null;
  sharedByLabel: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VaultListScope = "all" | "mine" | "shared";

export function teamVaultOwnerId(session: TeamSession): string {
  return teamPersonalNoteOwnerId(session);
}

export function vaultOwnerLabel(ownerId: string): string {
  if (ownerId === "admin") return "Admin";
  return teamMemberName(ownerId);
}

type EntryWithShares = TeamVaultEntry & { shares?: TeamVaultShare[] };

export function toTeamVaultEntryDto(
  row: EntryWithShares,
  viewerOwnerId: string,
  opts?: { sharedBy?: string | null }
): TeamVaultEntryDto {
  const shares = row.shares ?? [];
  const sharedWith = shares.map((s) => s.memberId);
  const isOwner = row.ownerId === viewerOwnerId;
  const sharedBy = opts?.sharedBy ?? (isOwner ? null : row.ownerId);

  return {
    id: row.id,
    ownerId: row.ownerId,
    ownerLabel: vaultOwnerLabel(row.ownerId),
    title: row.title,
    username: row.username,
    url: row.url,
    notes: row.notes,
    outletId: row.outletId,
    category: row.category,
    isOwner,
    sharedWith,
    sharedWithLabels: sharedWith.map((id) => vaultOwnerLabel(id)),
    sharedBy: isOwner ? null : sharedBy,
    sharedByLabel: isOwner ? null : vaultOwnerLabel(sharedBy ?? row.ownerId),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function vaultDisplayTitle(entry: Pick<TeamVaultEntryDto, "title" | "url" | "username">): string {
  if (entry.title?.trim()) return entry.title.trim();
  if (entry.url?.trim()) return linkDisplayLabel(entry.url);
  if (entry.username?.trim()) return entry.username.trim();
  return "Password";
}

export function vaultPreviewText(entry: Pick<TeamVaultEntryDto, "username" | "url" | "notes">): string {
  if (entry.username?.trim()) return entry.username.trim();
  if (entry.url?.trim()) return entry.url.trim();
  if (entry.notes?.trim()) return entry.notes.trim().slice(0, 80);
  return "No username";
}

export { formatNoteListDate as formatVaultListDate };

export function parseVaultUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (!v) return null;
  return v.slice(0, 320);
}

export function parseVaultPassword(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (!v) return null;
  if (v.length > 2000) return null;
  return v;
}

export function parseVaultUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (!v) return null;
  return v.slice(0, 2000);
}

export function parseVaultNotes(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (!v) return null;
  return v.slice(0, 5000);
}

export function parseVaultTitle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (!v) return null;
  return v.slice(0, 200);
}

export function parseVaultOutletId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  return v && isTeamOutletId(v) ? v : null;
}

export function parseVaultCategory(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (!v) return null;
  return v.slice(0, 80);
}

export function isShareableMemberId(id: string): boolean {
  return id === "admin" || isTeamMemberId(id);
}

export function parseShareMemberIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const id = item.trim();
    if (!id || !isShareableMemberId(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out.slice(0, 20);
}

export function inferVaultTitle(
  title: string | null,
  url: string | null,
  username: string | null
): string | null {
  if (title) return title;
  if (url) return linkDisplayLabel(url);
  if (username) return username.slice(0, 80);
  return null;
}

export function parseVaultPayload(body: Record<string, unknown>) {
  return {
    title: parseVaultTitle(body.title),
    username: parseVaultUsername(body.username),
    password: parseVaultPassword(body.password),
    url: parseVaultUrl(body.url),
    notes: parseVaultNotes(body.notes),
    outletId: parseVaultOutletId(body.outletId),
    category: parseVaultCategory(body.category),
  };
}

export function filterVaultEntries(
  entries: TeamVaultEntryDto[],
  opts: { q?: string; scope?: VaultListScope }
): TeamVaultEntryDto[] {
  let rows = entries;
  const scope = opts.scope ?? "all";
  if (scope === "mine") rows = rows.filter((e) => e.isOwner);
  if (scope === "shared") rows = rows.filter((e) => !e.isOwner);

  const q = opts.q?.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((e) => {
    const hay = [
      e.title,
      e.username,
      e.url,
      e.notes,
      e.category,
      e.ownerLabel,
      e.sharedByLabel,
      ...e.sharedWithLabels,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
