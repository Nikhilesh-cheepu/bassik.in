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
    where: {
      ownerId,
      kind: "habits",
      title: BOARD_NOTES_CHECKLIST_TITLE,
      outletId: null,
    },
  });
  if (!row) {
    return prisma.teamDailyChecklist.create({
      data: {
        ownerId,
        kind: "habits",
        title: BOARD_NOTES_CHECKLIST_TITLE,
        description: serializeBoardNotes({ postings: "", ads: "", driveFolderUrl: "" }),
        outletId: null,
        createdBy,
      },
    });
  }
  return row;
}

/** Admin: update sticky board notes or Drive folder URL. */
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
      ownerId?: string;
    };

    const ownerId =
      body.ownerId && isTeamMemberId(body.ownerId) ? body.ownerId : CHECKLIST_DEFAULT_OWNER_ID;
    const createdBy = teamPersonalNoteOwnerId(session);
    const row = await getOrCreateNotesChecklist(ownerId, createdBy);
    const current = parseBoardNotesDescription(row.description);

    let next = { ...current };

    if (typeof body.driveFolderUrl === "string") {
      next.driveFolderUrl = body.driveFolderUrl.trim();
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
    } else if (typeof body.driveFolderUrl !== "string") {
      return NextResponse.json(
        { error: "tab (postings|ads) or driveFolderUrl required" },
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
