import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import {
  BOARD_NOTES_CHECKLIST_TITLE,
  parseBoardNotesDescription,
  serializeBoardNotes,
  type DriveFolderEntry,
} from "@/lib/team-checklists";
import { teamPersonalNoteOwnerId } from "@/lib/team-personal-notes";
import { isTeamMemberId } from "@/lib/team-members";
import { CHECKLIST_DEFAULT_OWNER_ID } from "@/lib/team-checklist-templates";
import { isTeamOutletId } from "@/lib/team-outlets";

async function getOrCreateNotesChecklist(ownerId: string, createdBy: string) {
  let row = await prisma.teamDailyChecklist.findFirst({
    where: {
      ownerId,
      kind: "habits",
      outletId: null,
    },
  });
  if (!row) {
    return prisma.teamDailyChecklist.create({
      data: {
        ownerId,
        kind: "habits",
        title: BOARD_NOTES_CHECKLIST_TITLE,
        description: serializeBoardNotes({
          postings: "",
          ads: "",
          driveFolders: [],
        }),
        outletId: null,
        createdBy,
      },
    });
  }
  if (row.title !== BOARD_NOTES_CHECKLIST_TITLE) {
    const looksLikeJson = Boolean(row.description?.trim().startsWith("{"));
    row = await prisma.teamDailyChecklist.update({
      where: { id: row.id },
      data: {
        title: BOARD_NOTES_CHECKLIST_TITLE,
        description: looksLikeJson
          ? row.description
          : serializeBoardNotes({ postings: "", ads: "", driveFolders: [] }),
      },
    });
  }
  return row;
}

function normalizeDriveFolders(raw: unknown): DriveFolderEntry[] | null {
  if (!Array.isArray(raw)) return null;
  const out: DriveFolderEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const url = typeof r.url === "string" ? r.url.trim() : "";
    if (!url) continue;
    const outletIds = Array.isArray(r.outletIds)
      ? r.outletIds
          .filter((id): id is string => typeof id === "string")
          .map((id) => id.trim())
          .filter((id) => isTeamOutletId(id))
      : [];
    out.push({
      id:
        typeof r.id === "string" && r.id.trim()
          ? r.id.trim()
          : `drv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      url,
      outletIds,
      description: typeof r.description === "string" ? r.description.trim() : "",
    });
  }
  return out;
}

/** Admin: update sticky board notes or Drive folders. */
export async function PATCH(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as {
      tab?: string;
      notes?: string;
      driveFolderUrl?: string;
      driveFolders?: unknown;
      ownerId?: string;
    };

    const ownerId =
      body.ownerId && isTeamMemberId(body.ownerId) ? body.ownerId : CHECKLIST_DEFAULT_OWNER_ID;
    const createdBy = teamPersonalNoteOwnerId(session);
    const row = await getOrCreateNotesChecklist(ownerId, createdBy);
    const current = parseBoardNotesDescription(row.description);

    let next = { ...current };
    let touched = false;

    if (body.driveFolders !== undefined) {
      const folders = normalizeDriveFolders(body.driveFolders);
      if (!folders) {
        return NextResponse.json({ error: "driveFolders must be an array" }, { status: 400 });
      }
      next.driveFolders = folders;
      next.driveFolderUrl = folders[0]?.url ?? "";
      touched = true;
    } else if (typeof body.driveFolderUrl === "string") {
      const url = body.driveFolderUrl.trim();
      next.driveFolderUrl = url;
      next.driveFolders = url
        ? [
            {
              id: current.driveFolders[0]?.id ?? `drv_${Date.now().toString(36)}`,
              url,
              outletIds: current.driveFolders[0]?.outletIds ?? [],
              description: current.driveFolders[0]?.description ?? "",
            },
          ]
        : [];
      touched = true;
    }

    const tab = body.tab === "ads" ? "ads" : body.tab === "postings" ? "postings" : null;
    if (tab) {
      if (typeof body.notes !== "string") {
        return NextResponse.json({ error: "notes string required" }, { status: 400 });
      }
      next = {
        ...next,
        postings: tab === "postings" ? body.notes : current.postings,
        ads: tab === "ads" ? body.notes : current.ads,
      };
      touched = true;
    }

    if (!touched) {
      return NextResponse.json(
        { error: "tab (postings|ads) or driveFolders required" },
        { status: 400 }
      );
    }

    const updated = await prisma.teamDailyChecklist.update({
      where: { id: row.id },
      data: { description: serializeBoardNotes(next) },
    });

    return NextResponse.json({
      boardNotes: parseBoardNotesDescription(updated.description),
    });
  } catch (err) {
    console.error("[team/checklists/board-notes] PATCH error:", err);
    return NextResponse.json({ error: "Failed to save notes" }, { status: 500 });
  }
}
