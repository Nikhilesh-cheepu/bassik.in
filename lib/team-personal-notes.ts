import type { TeamNoteShare, TeamPersonalNote } from "@prisma/client";
import type { TeamSession } from "@/lib/team-auth";
import { isTeamMemberId, teamMemberName } from "@/lib/team-members";
import { isTeamOutletId } from "@/lib/team-outlets";
import { teamReminderOwnerId } from "@/lib/team-reminders";

export type NoteAttachment = {
  url: string;
  fileName: string;
  mimeType: string;
};

export type TeamPersonalNoteDto = {
  id: string;
  ownerId: string;
  ownerLabel: string;
  title: string | null;
  outletId: string | null;
  category: string | null;
  body: string;
  aiSummary: string | null;
  linkUrls: string[];
  attachments: NoteAttachment[];
  isOwner: boolean;
  sharedWith: string[];
  sharedWithLabels: string[];
  sharedBy: string | null;
  sharedByLabel: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NoteListScope = "all" | "mine" | "shared";

export function teamPersonalNoteOwnerId(session: TeamSession): string {
  return teamReminderOwnerId(session);
}

export function noteOwnerLabel(ownerId: string): string {
  if (ownerId === "admin") return "Admin";
  return teamMemberName(ownerId);
}

const URL_RE = /https?:\/\/[^\s<>"']+/gi;

export function extractNoteUrls(text: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const m of text.matchAll(URL_RE)) {
    const u = m[0].replace(/[.,;:!?)]+$/, "");
    if (!seen.has(u)) {
      seen.add(u);
      urls.push(u);
    }
  }
  return urls;
}

export function linkDisplayLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (/instagram\.com/i.test(host)) return "Instagram";
    if (/drive\.google\.com/i.test(host)) return "Google Drive";
    if (/docs\.google\.com/i.test(host)) return "Google Doc";
    return host;
  } catch {
    return "Link";
  }
}

export function isInstagramUrl(url: string): boolean {
  try {
    return /instagram\.com/i.test(new URL(url).hostname);
  } catch {
    return /instagram\.com/i.test(url);
  }
}

export function parseNoteAttachments(raw: unknown): NoteAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a): a is Record<string, unknown> => Boolean(a) && typeof a === "object")
    .map((a) => ({
      url: typeof a.url === "string" ? a.url : "",
      fileName: typeof a.fileName === "string" ? a.fileName : "file",
      mimeType: typeof a.mimeType === "string" ? a.mimeType : "application/octet-stream",
    }))
    .filter((a) => a.url)
    .slice(0, 20);
}

type NoteWithShares = TeamPersonalNote & { shares?: TeamNoteShare[] };

export function toTeamPersonalNoteDto(
  row: NoteWithShares,
  viewerOwnerId: string,
  opts?: { sharedBy?: string | null }
): TeamPersonalNoteDto {
  const shares = row.shares ?? [];
  const sharedWith = shares.map((s) => s.memberId);
  const isOwner = row.ownerId === viewerOwnerId;
  const sharedBy = opts?.sharedBy ?? (isOwner ? null : row.ownerId);

  return {
    id: row.id,
    ownerId: row.ownerId,
    ownerLabel: noteOwnerLabel(row.ownerId),
    title: row.title,
    outletId: row.outletId,
    category: row.category,
    body: row.body,
    aiSummary: row.aiSummary,
    linkUrls: extractNoteUrls(row.body),
    attachments: parseNoteAttachments(row.attachments),
    isOwner,
    sharedWith,
    sharedWithLabels: sharedWith.map((id) => noteOwnerLabel(id)),
    sharedBy: isOwner ? null : sharedBy,
    sharedByLabel: isOwner ? null : noteOwnerLabel(sharedBy ?? row.ownerId),
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

const URL_STRIP_RE = /https?:\/\/[^\s<>"']+/gi;

export function noteDisplayTitle(
  note: Pick<TeamPersonalNoteDto, "title" | "body">
): string {
  if (note.title?.trim()) return note.title.trim();
  const line = note.body
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !/^https?:\/\//i.test(l));
  if (line) return line.slice(0, 80);
  if (note.body.trim()) return "Link note";
  return "Untitled";
}

export function notePreviewText(
  note: Pick<TeamPersonalNoteDto, "body" | "linkUrls" | "attachments" | "aiSummary">
): string {
  if (note.aiSummary?.trim()) return note.aiSummary.trim().slice(0, 140);
  const stripped = note.body.replace(URL_STRIP_RE, " ").replace(/\s+/g, " ").trim();
  if (stripped) return stripped.slice(0, 140);
  if (note.attachments.length)
    return `${note.attachments.length} file${note.attachments.length > 1 ? "s" : ""}`;
  if (note.linkUrls.length) return `${note.linkUrls.length} link${note.linkUrls.length > 1 ? "s" : ""}`;
  return "No additional text";
}

export function formatNoteListDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfNote = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfNote.getTime()) / 86400000);
  if (diffDays === 0) {
    return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return d.toLocaleDateString("en-IN", { weekday: "short" });
  }
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function parsePersonalNoteBody(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const body = raw.trim();
  if (!body) return null;
  if (body.length > 20000) return null;
  return body;
}

export function parsePersonalNoteTitle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const title = raw.trim();
  if (!title) return null;
  return title.slice(0, 200);
}

export function parsePersonalNoteOutletId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  return v && isTeamOutletId(v) ? v : null;
}

export function parsePersonalNoteCategory(raw: unknown): string | null {
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

export function inferNoteTitle(body: string, title: string | null): string | null {
  if (title) return title;
  const firstLine = body.split("\n").find((l) => l.trim() && !/^https?:\/\//i.test(l.trim()));
  if (!firstLine) return null;
  const t = firstLine.trim().slice(0, 120);
  return t.length >= 3 ? t : null;
}

export function parsePersonalNotePayload(body: Record<string, unknown>) {
  const parsedBody = parsePersonalNoteBody(body.body);
  const outletId = parsePersonalNoteOutletId(body.outletId);
  const title = parsePersonalNoteTitle(body.title);
  const category = parsePersonalNoteCategory(body.category);
  const aiSummary =
    typeof body.aiSummary === "string" && body.aiSummary.trim()
      ? body.aiSummary.trim().slice(0, 2000)
      : null;
  const attachments = parseNoteAttachments(body.attachments ?? body.attachmentUrls);
  return { body: parsedBody, outletId, title, category, aiSummary, attachments };
}

export function filterPersonalNotes(
  notes: TeamPersonalNoteDto[],
  opts: { q?: string; outletId?: string; scope?: NoteListScope }
): TeamPersonalNoteDto[] {
  let rows = notes;
  const scope = opts.scope ?? "all";
  if (scope === "mine") rows = rows.filter((n) => n.isOwner);
  if (scope === "shared") rows = rows.filter((n) => !n.isOwner);

  const outletId = opts.outletId?.trim();
  if (outletId) {
    if (outletId === "__direct__") {
      rows = rows.filter((n) => !n.outletId);
    } else {
      rows = rows.filter((n) => n.outletId === outletId);
    }
  }
  const q = opts.q?.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((n) => {
    const hay = [
      n.title,
      n.body,
      n.category,
      n.outletId,
      n.ownerLabel,
      n.sharedByLabel,
      ...n.sharedWithLabels,
      ...n.linkUrls,
      ...n.attachments.map((a) => a.fileName),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function canEditNote(note: TeamPersonalNoteDto, viewerOwnerId: string): boolean {
  return note.ownerId === viewerOwnerId;
}
