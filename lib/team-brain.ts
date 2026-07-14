import type { TeamBrainItem } from "@prisma/client";
import type { TeamSession } from "@/lib/team-auth";
import { teamPersonalNoteOwnerId } from "@/lib/team-personal-notes";

export type BrainKind = "note" | "reminder";

export type TeamBrainItemDto = {
  id: string;
  ownerId: string;
  kind: BrainKind;
  body: string;
  tags: string[];
  done: boolean;
  remindOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export function teamBrainOwnerId(session: TeamSession): string {
  return teamPersonalNoteOwnerId(session);
}

export function isBrainKind(v: string): v is BrainKind {
  return v === "note" || v === "reminder";
}

export function toTeamBrainItemDto(row: TeamBrainItem): TeamBrainItemDto {
  return {
    id: row.id,
    ownerId: row.ownerId,
    kind: isBrainKind(row.kind) ? row.kind : "note",
    body: row.body,
    tags: Array.isArray(row.tags) ? row.tags : [],
    done: row.done,
    remindOn: row.remindOn,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function normalizeBrainDate(raw: string | null | undefined): string | null {
  const v = raw?.trim() ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export function normalizeBrainTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const t = item.trim().replace(/^#/, "").slice(0, 32);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= 8) break;
  }
  return out;
}

export function parseBrainCreate(body: Record<string, unknown>): {
  kind: BrainKind;
  bodyText: string;
  tags: string[];
  remindOn: string | null;
} | { error: string } {
  const kind = body.kind === "reminder" ? "reminder" : "note";
  const bodyText = typeof body.body === "string" ? body.body.trim() : "";
  if (!bodyText) return { error: "Write something first." };
  if (bodyText.length > 4000) return { error: "Too long (max 4000)." };
  const tags = normalizeBrainTags(body.tags);
  const remindOn =
    kind === "reminder"
      ? normalizeBrainDate(typeof body.remindOn === "string" ? body.remindOn : null)
      : null;
  if (kind === "reminder" && !remindOn) {
    return { error: "Pick a reminder date." };
  }
  return { kind, bodyText, tags, remindOn };
}
