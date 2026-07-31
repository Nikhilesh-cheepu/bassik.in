import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { isTeamDesignerMember } from "@/lib/team-members";
import {
  DESIGNER_PERFORMANCE_IDS,
} from "@/lib/team-designer-jobs-shared";
import {
  computeAllDesignerPerformance,
  computeDesignerPerformance,
} from "@/lib/team-designer-performance";
import {
  evaluateAndSendDesignerNudges,
  listRecentReminderLogs,
} from "@/lib/team-designer-nudges";
import type { DesignerNudgeKind } from "@/lib/team-designer-jobs-shared";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.role === "admin";
  const memberId = session.memberId ?? "";

  try {
    if (isAdmin) {
      const [designers, reminders] = await Promise.all([
        computeAllDesignerPerformance(),
        listRecentReminderLogs(50),
      ]);
      return NextResponse.json({ ok: true, designers, reminders });
    }

    if (!isTeamDesignerMember(memberId) || !DESIGNER_PERFORMANCE_IDS.includes(memberId as typeof DESIGNER_PERFORMANCE_IDS[number])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const me = await computeDesignerPerformance(memberId);
    return NextResponse.json({ ok: true, designers: [me], reminders: [] });
  } catch (err) {
    console.error("[team/designer-performance] GET", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message.slice(0, 200) : "Failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      assigneeId?: string;
      kind?: DesignerNudgeKind;
    };

    if (body.action !== "nudge") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const assigneeId =
      typeof body.assigneeId === "string" ? body.assigneeId.trim() : "";
    if (!DESIGNER_PERFORMANCE_IDS.includes(assigneeId as typeof DESIGNER_PERFORMANCE_IDS[number])) {
      return NextResponse.json({ error: "assigneeId required (mahesh|jeslyn)" }, { status: 400 });
    }

    const kind = body.kind;
    const forceKinds: DesignerNudgeKind[] = kind
      ? [kind]
      : ["behind_pace"];

    const result = await evaluateAndSendDesignerNudges({
      assigneeIds: [assigneeId],
      forceKinds,
      force: true,
    });
    const reminders = await listRecentReminderLogs(50);
    return NextResponse.json({ ...result, reminders });
  } catch (err) {
    console.error("[team/designer-performance] POST", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message.slice(0, 200) : "Failed" },
      { status: 500 }
    );
  }
}
