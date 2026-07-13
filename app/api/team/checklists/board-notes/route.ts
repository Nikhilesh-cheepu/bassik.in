import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import {
  BOARD_NOTES_CHECKLIST_TITLE,
  parseBoardNotesDescription,
  serializeBoardNotes,
} from "@/lib/team-checklists";
import { teamPersonalNoteOwnerId } from "@/lib/team-personal-notes";
import { isTeamMemberId } from "@/lib/team-members";
import { CHECKLIST_DEFAULT_OWNER_ID } from "@/lib/team-checklist-templates";

async function getOrCreateNotesChecklist(ownerId: string, createdBy: string) {
  let row = await prisma.teamDailyChecklist.findFirst({
    where: { ownerId, kind: "habits", outletId: null },
  });
  if (!row) {
    return prisma.teamDailyChecklist.create({
      data: {
        ownerId,
        kind: "habits",
        title: BOARD_NOTES_CHECKLIST_TITLE,
        description: serializeBoardNotes({ postings: "", ads: "" }),
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
        // Don't treat old habit copy as board notes
        description: looksLikeJson
          ? row.description
          : serializeBoardNotes({ postings: "", ads: "" }),
      },
    });
  }
  return row;
}

/** Admin: update sticky board notes for Postings or Ads tab. */
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
      ownerId?: string;
    };
    const tab = body.tab === "ads" ? "ads" : body.tab === "postings" ? "postings" : null;
    if (!tab) {
      return NextResponse.json({ error: "tab must be postings or ads" }, { status: 400 });
    }
    if (typeof body.notes !== "string") {
      return NextResponse.json({ error: "notes string required" }, { status: 400 });
    }

    const ownerId =
      body.ownerId && isTeamMemberId(body.ownerId) ? body.ownerId : CHECKLIST_DEFAULT_OWNER_ID;
    const createdBy = teamPersonalNoteOwnerId(session);
    const row = await getOrCreateNotesChecklist(ownerId, createdBy);
    const current = parseBoardNotesDescription(row.description);
    const next = {
      postings: tab === "postings" ? body.notes : current.postings,
      ads: tab === "ads" ? body.notes : current.ads,
    };
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
