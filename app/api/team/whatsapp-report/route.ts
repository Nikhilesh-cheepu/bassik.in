import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import {
  buildTeamWhatsAppReport,
  buildWhatsAppFromTasks,
  defaultSelectedIds,
  whatsAppShareUrl,
  type WhatsAppReportMode,
} from "@/lib/team-whatsapp-report";
import { prisma } from "@/lib/db";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

const MODES = new Set<WhatsAppReportMode>(["reminder", "assigned", "full"]);

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await prisma.teamAdTask.findMany({
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });
    const text = buildTeamWhatsAppReport(rows);
    const phone = process.env.TEAM_WHATSAPP_PHONE?.trim() || null;
    return NextResponse.json({
      text,
      shareUrl: whatsAppShareUrl(text, phone),
      tasks: rows.map((t) => ({ id: t.id, title: t.title, status: t.status, assigneeId: t.assigneeId, outletId: t.outletId, deadlineDate: t.deadlineDate, createdAt: t.createdAt.toISOString() })),
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team whatsapp-report]", error);
    return NextResponse.json({ error: "Could not build report" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const mode = (typeof body.mode === "string" ? body.mode : "reminder") as WhatsAppReportMode;
  const safeMode = MODES.has(mode) ? mode : "reminder";
  const taskIds = Array.isArray(body.taskIds)
    ? body.taskIds.filter((id: unknown): id is string => typeof id === "string")
    : [];

  try {
    const rows = await prisma.teamAdTask.findMany({
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });
    const ids = taskIds.length ? taskIds : defaultSelectedIds(rows, safeMode);
    const text = buildWhatsAppFromTasks(rows, ids, safeMode);
    const phone = process.env.TEAM_WHATSAPP_PHONE?.trim() || null;
    return NextResponse.json({
      text,
      shareUrl: whatsAppShareUrl(text, phone),
      mode: safeMode,
      selectedCount: ids.length,
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team whatsapp-report POST]", error);
    return NextResponse.json({ error: "Could not build report" }, { status: 500 });
  }
}
