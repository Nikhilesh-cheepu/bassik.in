import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import {
  filterPersonalNotes,
  inferNoteTitle,
  parsePersonalNotePayload,
  parseShareMemberIds,
  teamPersonalNoteOwnerId,
  toTeamPersonalNoteDto,
  type NoteListScope,
} from "@/lib/team-personal-notes";

function notesDbErrorMessage(error: unknown): string {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  ) {
    return "Notes database is not ready yet. Redeploy to apply migrations.";
  }
  return "Could not load notes";
}

const SCOPES = new Set<string>(["all", "mine", "shared"]);

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const outletId = req.nextUrl.searchParams.get("outletId") ?? "";
  const scopeRaw = req.nextUrl.searchParams.get("scope") ?? "all";
  const scope = (SCOPES.has(scopeRaw) ? scopeRaw : "all") as NoteListScope;

  try {
    const viewerOwnerId = teamPersonalNoteOwnerId(session);

    const [ownRows, shareRows] = await Promise.all([
      prisma.teamPersonalNote.findMany({
        where: { ownerId: viewerOwnerId },
        include: { shares: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.teamNoteShare.findMany({
        where: { memberId: viewerOwnerId },
        include: { note: { include: { shares: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const ownIds = new Set(ownRows.map((n) => n.id));
    const merged = [
      ...ownRows.map((row) => toTeamPersonalNoteDto(row, viewerOwnerId)),
      ...shareRows
        .filter((s) => !ownIds.has(s.note.id))
        .map((s) => toTeamPersonalNoteDto(s.note, viewerOwnerId, { sharedBy: s.sharedBy })),
    ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const notes = filterPersonalNotes(merged, { q, outletId, scope });

    return NextResponse.json({ notes, scope });
  } catch (error) {
    console.error("[team notes GET]", error);
    return NextResponse.json({ error: notesDbErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = parsePersonalNotePayload(body);
  const noteBody = parsed.body ?? (parsed.attachments.length ? "See attached files." : null);
  if (!noteBody) {
    return NextResponse.json({ error: "Add text or attach a file." }, { status: 400 });
  }

  const shareWith = parseShareMemberIds(body.sharedWith).filter(
    (id) => id !== teamPersonalNoteOwnerId(session)
  );

  try {
    const ownerId = teamPersonalNoteOwnerId(session);
    const row = await prisma.teamPersonalNote.create({
      data: {
        ownerId,
        body: noteBody,
        outletId: parsed.outletId,
        title: inferNoteTitle(noteBody, parsed.title),
        category: parsed.category,
        aiSummary: parsed.aiSummary,
        attachments: parsed.attachments.length ? parsed.attachments : undefined,
        shares: shareWith.length
          ? {
              create: shareWith.map((memberId) => ({
                memberId,
                sharedBy: ownerId,
              })),
            }
          : undefined,
      },
      include: { shares: true },
    });

    return NextResponse.json({ note: toTeamPersonalNoteDto(row, ownerId) });
  } catch (error) {
    console.error("[team notes POST]", error);
    return NextResponse.json(
      { error: notesDbErrorMessage(error).replace("load", "save") },
      { status: 500 }
    );
  }
}
