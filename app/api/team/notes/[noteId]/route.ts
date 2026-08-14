import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import {
  inferNoteTitle,
  parseNoteAttachments,
  parsePersonalNoteBody,
  parsePersonalNoteCategory,
  parsePersonalNoteOutletId,
  parsePersonalNoteTitle,
  parseShareMemberIds,
  teamPersonalNoteOwnerId,
  toTeamPersonalNoteDto,
} from "@/lib/team-personal-notes";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const session = await getTeamFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { noteId } = await params;
  const viewerOwnerId = teamPersonalNoteOwnerId(session);
  const existing = await prisma.teamPersonalNote.findUnique({
    where: { id: noteId },
    include: { shares: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.ownerId !== viewerOwnerId) {
    return NextResponse.json({ error: "Only the note owner can edit." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (body.body !== undefined) {
    const parsed = parsePersonalNoteBody(body.body);
    if (!parsed) {
      return NextResponse.json({ error: "Note cannot be empty." }, { status: 400 });
    }
    data.body = parsed;
  }
  if (body.title !== undefined) {
    data.title = parsePersonalNoteTitle(body.title);
  }
  if (body.outletId !== undefined) {
    data.outletId = parsePersonalNoteOutletId(body.outletId);
  }
  if (body.category !== undefined) {
    data.category = parsePersonalNoteCategory(body.category);
  }
  if (body.aiSummary !== undefined) {
    data.aiSummary =
      typeof body.aiSummary === "string" && body.aiSummary.trim()
        ? body.aiSummary.trim().slice(0, 2000)
        : null;
  }
  if (body.attachments !== undefined || body.attachmentUrls !== undefined) {
    const attachments = parseNoteAttachments(body.attachments ?? body.attachmentUrls);
    data.attachments = attachments.length ? attachments : null;
  }

  if (Object.keys(data).length === 0 && body.sharedWith === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const nextBody = typeof data.body === "string" ? data.body : existing.body;
  if (body.body !== undefined || body.title !== undefined) {
    data.title = inferNoteTitle(
      nextBody,
      body.title !== undefined ? (data.title as string | null) : existing.title
    );
  }

  try {
    const memberIds =
      body.sharedWith !== undefined
        ? parseShareMemberIds(body.sharedWith).filter((id) => id !== viewerOwnerId)
        : null;

    const row = await prisma.$transaction(async (tx) => {
      if (memberIds) {
        await tx.teamNoteShare.deleteMany({ where: { noteId } });
        if (memberIds.length) {
          await tx.teamNoteShare.createMany({
            data: memberIds.map((memberId) => ({
              noteId,
              memberId,
              sharedBy: viewerOwnerId,
            })),
          });
        }
      }

      if (Object.keys(data).length === 0) {
        return tx.teamPersonalNote.findUniqueOrThrow({
          where: { id: noteId },
          include: { shares: true },
        });
      }

      return tx.teamPersonalNote.update({
        where: { id: noteId },
        data: data as Prisma.TeamPersonalNoteUpdateInput,
        include: { shares: true },
      });
    });

    return NextResponse.json({ note: toTeamPersonalNoteDto(row, viewerOwnerId) });
  } catch (error) {
    console.error("[team notes PATCH]", error);
    return NextResponse.json({ error: "Could not update note" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const session = await getTeamFromRequest(_req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { noteId } = await params;
  const viewerOwnerId = teamPersonalNoteOwnerId(session);
  const existing = await prisma.teamPersonalNote.findUnique({ where: { id: noteId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.ownerId !== viewerOwnerId) {
    return NextResponse.json({ error: "Only the note owner can delete." }, { status: 403 });
  }

  await prisma.teamPersonalNote.delete({ where: { id: noteId } });
  return NextResponse.json({ ok: true });
}
