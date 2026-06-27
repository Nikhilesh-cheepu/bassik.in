import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import {
  buildMemberDoneReport,
  defaultMemberDoneIds,
  whatsAppShareUrl,
} from "@/lib/team-whatsapp-report";
import { prisma } from "@/lib/db";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session || session.role !== "member" || !session.memberId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const rows = await prisma.teamAdTask.findMany({
      where: { assigneeId: session.memberId, status: "DONE" },
      orderBy: [{ completedAt: "desc" }, { updatedAt: "desc" }],
      take: 50,
    });
    return NextResponse.json({
      tasks: rows.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        outletId: t.outletId,
        completedAt: t.completedAt?.toISOString() ?? null,
      })),
      defaultIds: defaultMemberDoneIds(rows),
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team member-done-report GET]", error);
    return NextResponse.json({ error: "Could not load tasks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session || session.role !== "member" || !session.memberId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const taskIds = Array.isArray(body.taskIds)
    ? body.taskIds.filter((id: unknown): id is string => typeof id === "string")
    : [];

  try {
    const rows = await prisma.teamAdTask.findMany({
      where: { assigneeId: session.memberId, status: "DONE" },
      orderBy: [{ completedAt: "desc" }, { updatedAt: "desc" }],
    });

    const allowed = new Set(rows.map((t) => t.id));
    const ids = (taskIds.length ? taskIds : defaultMemberDoneIds(rows)).filter((id: string) =>
      allowed.has(id)
    );

    if (ids.length === 0) {
      return NextResponse.json({ error: "No done tasks to send" }, { status: 400 });
    }

    const text = buildMemberDoneReport(session.memberId, rows, ids);
    const phone = process.env.TEAM_WHATSAPP_PHONE?.trim() || null;
    return NextResponse.json({
      text,
      shareUrl: whatsAppShareUrl(text, phone),
      selectedCount: ids.length,
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team member-done-report POST]", error);
    return NextResponse.json({ error: "Could not build report" }, { status: 500 });
  }
}
