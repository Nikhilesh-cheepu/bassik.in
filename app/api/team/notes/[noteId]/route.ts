import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import { teamPersonalNoteOwnerId, toTeamPersonalNoteDto } from "@/lib/team-personal-notes";

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
  const existing = await prisma.teamPersonalNote.findUnique({ where: { id: noteId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.ownerId !== teamPersonalNoteOwnerId(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.teamPersonalNote.delete({ where: { id: noteId } });
  return NextResponse.json({ ok: true });
}
