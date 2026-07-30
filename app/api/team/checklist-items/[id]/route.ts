import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import { isTeamDesignerMember } from "@/lib/team-members";
import {
  getTodayKey,
  handoffByDateFromJson,
  parseDayOfWeek,
  parseHandoffFormat,
  parsePlatforms,
  readyDatesFromJson,
  toTeamChecklistItemDto,
  type ChecklistHandoffDto,
  type HandoffStatus,
} from "@/lib/team-checklists";

type HandoffAction = "approve" | "unapprove" | "set-ready" | "clear";

function serializeHandoffMap(
  map: Record<string, ChecklistHandoffDto>
): Prisma.InputJsonValue {
  const out: Record<string, Record<string, string>> = {};
  for (const [date, entry] of Object.entries(map)) {
    if (
      entry.status === "wait" &&
      !entry.fileUrl &&
      !entry.postingNotes &&
      !entry.scheduleNote &&
      !entry.format
    ) {
      continue;
    }
    const row: Record<string, string> = { status: entry.status };
    if (entry.format) row.format = entry.format;
    if (entry.fileUrl) row.fileUrl = entry.fileUrl;
    if (entry.postingNotes) row.postingNotes = entry.postingNotes;
    if (entry.scheduleNote) row.scheduleNote = entry.scheduleNote;
    if (entry.uploadedAt) row.uploadedAt = entry.uploadedAt;
    out[date] = row;
  }
  return out;
}

function syncReadyDates(
  readyDates: string[],
  dateKey: string,
  status: HandoffStatus
): string[] {
  if (status === "ready") {
    return readyDates.includes(dateKey) ? readyDates : [...readyDates, dateKey];
  }
  return readyDates.filter((d) => d !== dateKey);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const memberId = session.memberId ?? session.username;
  const isAdmin = session.role === "admin";
  const isDesigner = isTeamDesignerMember(memberId);

  try {
    const item = await prisma.teamChecklistItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      title?: string;
      description?: string;
      instructions?: string;
      dayOfWeek?: string;
      platforms?: unknown;
      sortOrder?: number;
      /** @deprecated prefer handoff.action — still sets ready for admin */
      creativeReady?: boolean;
      date?: string;
      handoff?: {
        action?: HandoffAction;
        format?: string;
        fileUrl?: string;
        postingNotes?: string;
        scheduleNote?: string;
      };
    };

    const hasMetaEdit =
      body.title !== undefined ||
      body.description !== undefined ||
      body.instructions !== undefined ||
      body.dayOfWeek !== undefined ||
      body.platforms !== undefined ||
      typeof body.sortOrder === "number";

    const handoffAction = body.handoff?.action;
    const hasHandoff = Boolean(handoffAction) || typeof body.creativeReady === "boolean";

    if (hasMetaEdit && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (hasHandoff && !isAdmin) {
      if (!isDesigner || handoffAction !== "set-ready") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (!hasMetaEdit && !hasHandoff) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const updates: {
      title?: string;
      description?: string | null;
      instructions?: string | null;
      dayOfWeek?: string | null;
      platforms?: string[];
      sortOrder?: number;
      readyDates?: string[];
      handoff?: Prisma.InputJsonValue;
    } = {};

    if (body.title !== undefined) {
      const title = body.title.trim();
      if (!title) {
        return NextResponse.json({ error: "Title required" }, { status: 400 });
      }
      updates.title = title;
    }

    if (body.description !== undefined) {
      updates.description = body.description.trim() || null;
    }

    if (body.instructions !== undefined) {
      updates.instructions = body.instructions.trim() || null;
    }

    if (body.dayOfWeek !== undefined) {
      updates.dayOfWeek = parseDayOfWeek(body.dayOfWeek);
    }

    if (body.platforms !== undefined) {
      updates.platforms = parsePlatforms(body.platforms);
    }

    if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
      updates.sortOrder = Math.round(body.sortOrder);
    }

    if (hasHandoff) {
      const dateRaw = typeof body.date === "string" ? body.date.trim() : getTodayKey();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
        return NextResponse.json({ error: "Valid date required" }, { status: 400 });
      }

      let action: HandoffAction | null = handoffAction ?? null;
      if (!action && typeof body.creativeReady === "boolean") {
        // Legacy toggle: green = ready, red = clear
        action = body.creativeReady ? "set-ready" : "clear";
      }
      if (!action) {
        return NextResponse.json({ error: "handoff.action required" }, { status: 400 });
      }

      const map = handoffByDateFromJson(item.handoff);
      const prev = map[dateRaw] ?? { status: "wait" as const };
      let next: ChecklistHandoffDto = { ...prev };

      if (action === "approve") {
        if (!isAdmin) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        next = {
          ...prev,
          status: "approved",
        };
      } else if (action === "unapprove") {
        if (!isAdmin) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        next = { status: "wait" };
      } else if (action === "clear") {
        if (!isAdmin) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        next = { status: "wait" };
      } else if (action === "set-ready") {
        // WhatsApp approval is offline — designer uploads final → Amit gets it immediately.
        const format = parseHandoffFormat(body.handoff?.format) ?? prev.format ?? null;
        const fileUrl =
          typeof body.handoff?.fileUrl === "string" && body.handoff.fileUrl.trim()
            ? body.handoff.fileUrl.trim()
            : prev.fileUrl ?? null;
        const postingNotes =
          typeof body.handoff?.postingNotes === "string"
            ? body.handoff.postingNotes.trim() || null
            : prev.postingNotes ?? null;
        const scheduleNote =
          typeof body.handoff?.scheduleNote === "string"
            ? body.handoff.scheduleNote.trim() || null
            : prev.scheduleNote ?? null;

        if (!isAdmin) {
          if (!fileUrl) {
            return NextResponse.json({ error: "File URL required" }, { status: 400 });
          }
          if (!format) {
            return NextResponse.json(
              { error: "Format required (story / post / reel / ad)" },
              { status: 400 }
            );
          }
        }

        next = {
          status: "ready",
          format,
          fileUrl,
          postingNotes,
          scheduleNote,
          uploadedAt:
            fileUrl && fileUrl !== prev.fileUrl
              ? new Date().toISOString()
              : prev.uploadedAt ?? (fileUrl ? new Date().toISOString() : null),
        };
      }

      map[dateRaw] = next;
      updates.handoff = serializeHandoffMap(map);
      updates.readyDates = syncReadyDates(readyDatesFromJson(item.readyDates), dateRaw, next.status);
    }

    const updated = await prisma.teamChecklistItem.update({
      where: { id },
      data: updates,
      include: { completions: true },
    });

    return NextResponse.json({
      item: toTeamChecklistItemDto(updated, getTodayKey()),
    });
  } catch (err) {
    console.error("[team/checklist-items/[id]] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const item = await prisma.teamChecklistItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await prisma.teamChecklistItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[team/checklist-items/[id]] DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
