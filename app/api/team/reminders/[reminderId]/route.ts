import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import {
  parseReminderPayload,
  teamReminderOwnerId,
  toTeamReminderDto,
} from "@/lib/team-reminders";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reminderId: string }> }
) {
  const session = await getTeamFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { reminderId } = await params;
  const existing = await prisma.teamReminder.findUnique({ where: { id: reminderId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.ownerId !== teamReminderOwnerId(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.title === "string" && body.title.trim()) {
    data.title = body.title.trim().slice(0, 200);
  }
  if (body.description !== undefined) {
    data.description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim().slice(0, 2000)
        : null;
  }
  if (body.startDate !== undefined) {
    const d = typeof body.startDate === "string" ? body.startDate.trim() : "";
    data.startDate = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  }
  if (body.endDate !== undefined) {
    const d = typeof body.endDate === "string" ? body.endDate.trim() : "";
    data.endDate = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  }
  if (body.deadlineDate !== undefined) {
    const d = typeof body.deadlineDate === "string" ? body.deadlineDate.trim() : "";
    data.deadlineDate = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  }
  if (body.deadlineTime !== undefined) {
    const parsed = parseReminderPayload({ deadlineTime: body.deadlineTime });
    data.deadlineTime = parsed.deadlineTime;
  }

  if (body.status === "TODO" || body.status === "DONE") {
    data.status = body.status;
    data.completedAt = body.status === "DONE" ? new Date() : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const row = await prisma.teamReminder.update({ where: { id: reminderId }, data });
  return NextResponse.json({ reminder: toTeamReminderDto(row) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ reminderId: string }> }
) {
  const session = await getTeamFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { reminderId } = await params;
  const existing = await prisma.teamReminder.findUnique({ where: { id: reminderId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.ownerId !== teamReminderOwnerId(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.teamReminder.delete({ where: { id: reminderId } });
  return NextResponse.json({ success: true });
}
