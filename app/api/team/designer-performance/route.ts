import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { isTeamDesignerMember } from "@/lib/team-members";
import {
  DESIGNER_PERFORMANCE_IDS,
  type DesignerNudgeKind,
} from "@/lib/team-designer-jobs-shared";
import {
  computeAllDesignerPerformance,
  computeAllDesignerPerformanceLite,
  computeDesignerPerformance,
  computeDesignerPerformanceLite,
} from "@/lib/team-designer-performance";
import {
  buildDesignerQueueSummaryNudge,
  evaluateAndSendDesignerNudges,
  listRecentReminderLogs,
  listSuggestedDesignerNudges,
  markSuggestedNudgeOpened,
} from "@/lib/team-designer-nudges";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.role === "admin";
  const memberId = session.memberId ?? "";

  try {
    if (isAdmin) {
      // lite=1 → stack/series (home cards). extras=1 → WA only (no second full recompute).
      const lite = req.nextUrl.searchParams.get("lite") === "1";
      const extrasOnly = req.nextUrl.searchParams.get("extras") === "1";
      if (extrasOnly) {
        const [reminders, suggested] = await Promise.all([
          listRecentReminderLogs(50),
          listSuggestedDesignerNudges(),
        ]);
        return NextResponse.json({ ok: true, reminders, suggested });
      }
      if (lite) {
        const designers = await computeAllDesignerPerformanceLite();
        return NextResponse.json({
          ok: true,
          designers,
          reminders: [],
          suggested: [],
        });
      }
      // Full: designers + WA — prefer clients use lite then extras to avoid 40s double work
      const [designers, reminders, suggested] = await Promise.all([
        computeAllDesignerPerformance(),
        listRecentReminderLogs(50),
        listSuggestedDesignerNudges(),
      ]);
      return NextResponse.json({ ok: true, designers, reminders, suggested });
    }

    if (
      !isTeamDesignerMember(memberId) ||
      !DESIGNER_PERFORMANCE_IDS.includes(
        memberId as (typeof DESIGNER_PERFORMANCE_IDS)[number]
      )
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Designers hit ?lite=1 too — full recompute was hanging their Open tab (20–40s).
    const lite = req.nextUrl.searchParams.get("lite") === "1";
    const me = lite
      ? await computeDesignerPerformanceLite(memberId)
      : await computeDesignerPerformance(memberId);
    return NextResponse.json({ ok: true, designers: [me], reminders: [], suggested: [] });
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
      nudgeBody?: string;
      jobId?: string;
    };

    if (body.action === "summary") {
      const assigneeId =
        typeof body.assigneeId === "string" ? body.assigneeId.trim() : "";
      if (
        !DESIGNER_PERFORMANCE_IDS.includes(
          assigneeId as (typeof DESIGNER_PERFORMANCE_IDS)[number]
        )
      ) {
        return NextResponse.json(
          { error: "assigneeId required (mahesh|jeslyn)" },
          { status: 400 }
        );
      }
      const nudge = buildDesignerQueueSummaryNudge(assigneeId);
      return NextResponse.json({ ok: true, nudge });
    }

    if (body.action === "open-share") {
      const assigneeId =
        typeof body.assigneeId === "string" ? body.assigneeId.trim() : "";
      const kind = body.kind;
      const nudgeBody = typeof body.nudgeBody === "string" ? body.nudgeBody : "";
      const allowedAssignee =
        assigneeId === "amit" ||
        DESIGNER_PERFORMANCE_IDS.includes(
          assigneeId as (typeof DESIGNER_PERFORMANCE_IDS)[number]
        );
      if (!allowedAssignee || !kind || !nudgeBody.trim()) {
        return NextResponse.json({ error: "assigneeId, kind, nudgeBody required" }, { status: 400 });
      }
      const log = await markSuggestedNudgeOpened({
        assigneeId,
        kind,
        body: nudgeBody,
        jobId: typeof body.jobId === "string" ? body.jobId : "",
      });
      const [reminders, suggested] = await Promise.all([
        listRecentReminderLogs(50),
        listSuggestedDesignerNudges(),
      ]);
      return NextResponse.json({ ok: true, log, reminders, suggested });
    }

    if (body.action !== "nudge") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const assigneeId =
      typeof body.assigneeId === "string" ? body.assigneeId.trim() : "";
    if (
      !DESIGNER_PERFORMANCE_IDS.includes(
        assigneeId as (typeof DESIGNER_PERFORMANCE_IDS)[number]
      )
    ) {
      return NextResponse.json({ error: "assigneeId required (mahesh|jeslyn)" }, { status: 400 });
    }

    const kind = body.kind;
    const forceKinds: DesignerNudgeKind[] = kind ? [kind] : ["behind_pace"];

    const result = await evaluateAndSendDesignerNudges({
      assigneeIds: [assigneeId],
      forceKinds,
      force: true,
    });
    const [reminders, suggested] = await Promise.all([
      listRecentReminderLogs(50),
      listSuggestedDesignerNudges(),
    ]);
    return NextResponse.json({ ...result, reminders, suggested });
  } catch (err) {
    console.error("[team/designer-performance] POST", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message.slice(0, 200) : "Failed" },
      { status: 500 }
    );
  }
}
