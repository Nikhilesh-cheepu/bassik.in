import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";
import { teamPersonalNoteOwnerId } from "@/lib/team-personal-notes";
import {
  SHOOT_INCLUDE,
  canEditShoot,
  filterShootsForViewer,
  shootOwnerId,
  toTeamShootDto,
} from "@/lib/team-shoots";

type RouteCtx = { params: Promise<{ shootId: string }> };

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { shootId } = await ctx.params;
  const shoot = await prisma.teamShoot.findUnique({
    where: { id: shootId },
    include: SHOOT_INCLUDE,
  });
  if (!shoot) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditShoot(session, shoot.ownerId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const noteId = typeof body.noteId === "string" ? body.noteId.trim() : "";
  const createNote = body.create && typeof body.create === "object" ? (body.create as Record<string, unknown>) : null;

  try {
    let linkedNoteId = noteId;

    if (!linkedNoteId && createNote) {
      const title = typeof createNote.title === "string" ? createNote.title.trim().slice(0, 200) : null;
      const noteBody = typeof createNote.body === "string" ? createNote.body.trim() : "";
      if (!noteBody) {
        return NextResponse.json({ error: "Note body required" }, { status: 400 });
      }
      const note = await prisma.teamPersonalNote.create({
        data: {
          ownerId: teamPersonalNoteOwnerId(session),
          title,
          body: noteBody.slice(0, 20000),
          outletId: typeof createNote.outletId === "string" ? createNote.outletId || null : shoot.outletId,
          category: typeof createNote.category === "string" ? createNote.category.trim().slice(0, 80) : "Shoot",
        },
      });
      linkedNoteId = note.id;
    }

    if (!linkedNoteId) {
      return NextResponse.json({ error: "noteId or create body required" }, { status: 400 });
    }

    const note = await prisma.teamPersonalNote.findUnique({ where: { id: linkedNoteId } });
    if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

    const ownerId = teamPersonalNoteOwnerId(session);
    if (note.ownerId !== ownerId && session.role !== "admin") {
      return NextResponse.json({ error: "Can only link your own notes" }, { status: 403 });
    }

    await prisma.teamShootNoteLink.upsert({
      where: { shootId_noteId: { shootId, noteId: linkedNoteId } },
      create: {
        shootId,
        noteId: linkedNoteId,
        addedBy: ownerId,
      },
      update: {},
    });

    const updated = await prisma.teamShoot.findUnique({
      where: { id: shootId },
      include: SHOOT_INCLUDE,
    });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const viewerOwnerId = shootOwnerId(session);
    const [visible] = filterShootsForViewer([updated], session, viewerOwnerId);
    return NextResponse.json({ shoot: toTeamShootDto(visible!, viewerOwnerId, session) });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team shoots notes POST]", error);
    return NextResponse.json({ error: "Could not link note" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { shootId } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  const noteId = sp.get("noteId")?.trim();
  if (!noteId) return NextResponse.json({ error: "noteId required" }, { status: 400 });

  const shoot = await prisma.teamShoot.findUnique({ where: { id: shootId } });
  if (!shoot) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditShoot(session, shoot.ownerId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.teamShootNoteLink.deleteMany({ where: { shootId, noteId } });
    const updated = await prisma.teamShoot.findUnique({
      where: { id: shootId },
      include: SHOOT_INCLUDE,
    });
    const viewerOwnerId = shootOwnerId(session);
    const [visible] = filterShootsForViewer([updated!], session, viewerOwnerId);
    return NextResponse.json({ shoot: toTeamShootDto(visible!, viewerOwnerId, session) });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team shoots notes DELETE]", error);
    return NextResponse.json({ error: "Could not unlink note" }, { status: 500 });
  }
}
