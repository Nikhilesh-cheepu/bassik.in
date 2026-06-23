import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const taskIds = Array.isArray(body.taskIds)
    ? body.taskIds.filter((id: unknown): id is string => typeof id === "string" && Boolean(id.trim()))
    : [];

  if (taskIds.length === 0) {
    return NextResponse.json({ error: "No tasks to reorder" }, { status: 400 });
  }

  const existing = await prisma.teamAdTask.findMany({
    where: { id: { in: taskIds } },
    select: { id: true },
  });
  if (existing.length !== taskIds.length) {
    return NextResponse.json({ error: "Invalid task list" }, { status: 400 });
  }

  await prisma.$transaction(
    taskIds.map((id: string, index: number) =>
      prisma.teamAdTask.update({
        where: { id },
        data: { sortOrder: (index + 1) * 1000 },
      })
    )
  );

  return NextResponse.json({ success: true });
}
