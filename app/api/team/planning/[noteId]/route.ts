import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { parsePlanningPayload, toTeamPlanningDto } from "@/lib/team-planning";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const session = await getTeamFromRequest(req);
  if (!session || session.role === "viewer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { noteId } = await params;
  const existing = await prisma.teamPlanningNote.findUnique({ where: { id: noteId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (session.role !== "admin" && existing.createdBy !== session.username) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (body.type !== undefined) data.type = parsePlanningPayload({ type: body.type }).type;
  if (typeof body.title === "string" && body.title.trim()) {
    data.title = body.title.trim().slice(0, 200);
  }
  if (body.body !== undefined) {
    data.body =
      typeof body.body === "string" && body.body.trim()
        ? body.body.trim().slice(0, 8000)
        : null;
  }
  if (body.outletId !== undefined) {
    data.outletId = parsePlanningPayload({ outletId: body.outletId }).outletId;
  }
  if (body.imageUrls !== undefined) {
    data.imageUrls = parsePlanningPayload({ imageUrls: body.imageUrls }).imageUrls;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const row = await prisma.teamPlanningNote.update({ where: { id: noteId }, data });
  return NextResponse.json({ note: toTeamPlanningDto(row) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const session = await getTeamFromRequest(req);
  if (!session || session.role === "viewer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { noteId } = await params;
  const existing = await prisma.teamPlanningNote.findUnique({ where: { id: noteId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (session.role !== "admin" && existing.createdBy !== session.username) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.teamPlanningNote.delete({ where: { id: noteId } });
  return NextResponse.json({ success: true });
}
