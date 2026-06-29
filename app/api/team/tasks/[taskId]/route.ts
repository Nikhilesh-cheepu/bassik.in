import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { isTeamOutletId } from "@/lib/team-outlets";
import { isTeamMemberId } from "@/lib/team-members";
import { normalizeTeamPriority } from "@/lib/team-priority";
import { parseUrlList } from "@/lib/team-planning";
import { detectCreativeSource, normalizeTeamEndTime, normalizeTeamStartDate, toTeamTaskDto } from "@/lib/team-tasks";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getTeamFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { taskId } = await params;
  const existing = await prisma.teamAdTask.findUnique({ where: { id: taskId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (session.role === "member" || session.role === "poc") {
    const mid = session.memberId ?? session.username;
    if (existing.assigneeId !== mid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (existing.status === "PENDING_APPROVAL") {
      return NextResponse.json({ error: "Waiting for admin approval" }, { status: 403 });
    }
  }

  const body = await req.json().catch(() => ({}));

  if (body.action === "reject" && session.role === "admin") {
    if (existing.status !== "PENDING_APPROVAL") {
      return NextResponse.json({ error: "Not a pending record" }, { status: 400 });
    }
    await prisma.teamAdTask.delete({ where: { id: taskId } });
    return NextResponse.json({ success: true });
  }

  const data: Record<string, unknown> = {};

  if (session.role === "admin") {
    if (typeof body.outletId === "string" && isTeamOutletId(body.outletId.trim())) {
      data.outletId = body.outletId.trim();
    }
    if (typeof body.title === "string" && body.title.trim()) {
      data.title = body.title.trim().slice(0, 200);
    }
    if (body.description !== undefined) {
      data.description =
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim().slice(0, 2000)
          : null;
    }
    if (body.creativeUrl !== undefined) {
      const url = typeof body.creativeUrl === "string" ? body.creativeUrl.trim() : "";
      data.creativeUrl = url || null;
      if (url && !body.uploadedUrl) {
        data.creativeSource = detectCreativeSource(url);
      }
    }
    if (body.uploadedUrl !== undefined) {
      const url = typeof body.uploadedUrl === "string" ? body.uploadedUrl.trim() : "";
      data.uploadedUrl = url || null;
      if (url) data.creativeSource = "UPLOAD";
    }
    if (body.referenceUrls !== undefined) {
      const urls = parseUrlList(body.referenceUrls);
      data.referenceUrls = urls;
    }
    if (body.startDate !== undefined) {
      const d = typeof body.startDate === "string" ? body.startDate.trim() : "";
      data.startDate = normalizeTeamStartDate(d);
    }
    if (body.endDate !== undefined) {
      const d = typeof body.endDate === "string" ? body.endDate.trim() : "";
      data.endDate = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
    }
    if (body.endTime !== undefined) {
      const t = typeof body.endTime === "string" ? body.endTime.trim() : "";
      data.endTime = normalizeTeamEndTime(t);
    }
    if (body.deadlineDate !== undefined) {
      const d = typeof body.deadlineDate === "string" ? body.deadlineDate.trim() : "";
      data.deadlineDate = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
    }
    if (body.deadlineTime !== undefined) {
      const t = typeof body.deadlineTime === "string" ? body.deadlineTime.trim() : "";
      data.deadlineTime = normalizeTeamEndTime(t);
    }
    if (body.assigneeId !== undefined) {
      const id = typeof body.assigneeId === "string" ? body.assigneeId.trim() : "";
      if (!isTeamMemberId(id)) {
        return NextResponse.json({ error: "Invalid team member" }, { status: 400 });
      }
      data.assigneeId = id;
    }
    if (body.priority !== undefined) {
      data.priority = normalizeTeamPriority(
        typeof body.priority === "string" ? body.priority : undefined
      );
    }
    if (body.sortOrder !== undefined && typeof body.sortOrder === "number") {
      data.sortOrder = Math.round(body.sortOrder);
    }
  }

  if (body.status === "TODO" || body.status === "DONE") {
    if (existing.status === "PENDING_APPROVAL" && body.status === "DONE") {
      if (session.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      data.status = "DONE";
      data.completedBy = existing.assigneeId;
      data.completedAt = new Date();
    } else if (existing.status !== "PENDING_APPROVAL") {
      data.status = body.status;
      if (body.status === "DONE") {
        data.completedBy = session.username;
        data.completedAt = new Date();
      } else {
        data.completedBy = null;
        data.completedAt = null;
      }
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const row = await prisma.teamAdTask.update({
    where: { id: taskId },
    data,
  });

  return NextResponse.json({ task: toTeamTaskDto(row) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getTeamFromRequest(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;
  await prisma.teamAdTask.delete({ where: { id: taskId } });
  return NextResponse.json({ success: true });
}
