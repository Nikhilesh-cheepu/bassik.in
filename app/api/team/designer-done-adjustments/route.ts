import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { addDaysYmd, getTodayKey } from "@/lib/team-checklists";
import {
  clampDesignerDoneDelta,
  createDesignerDoneAdjustment,
  deleteDesignerDoneAdjustment,
  listDesignerDoneAdjustments,
} from "@/lib/team-designer-done-adjustments";
import {
  DESIGNER_PERFORMANCE_IDS,
  DESIGNER_STACK_START_DATE,
  clampDesignerWindowDays,
} from "@/lib/team-designer-jobs-shared";
import { invalidateDesignerPerformanceLiteCache } from "@/lib/team-designer-performance";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assigneeId = req.nextUrl.searchParams.get("assigneeId")?.trim() ?? "";
  if (
    !DESIGNER_PERFORMANCE_IDS.includes(
      assigneeId as (typeof DESIGNER_PERFORMANCE_IDS)[number]
    )
  ) {
    return NextResponse.json({ error: "assigneeId required" }, { status: 400 });
  }

  const today = getTodayKey();
  const days = clampDesignerWindowDays(req.nextUrl.searchParams.get("days"));
  const windowFrom = addDaysYmd(today, -(days - 1));
  const fromYmd =
    windowFrom < DESIGNER_STACK_START_DATE ? DESIGNER_STACK_START_DATE : windowFrom;

  try {
    const adjustments = await listDesignerDoneAdjustments({
      assigneeId,
      fromYmd,
      toYmd: today,
      limit: 30,
    });
    return NextResponse.json({ ok: true, adjustments });
  } catch (err) {
    console.error("[designer-done-adjustments] GET", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      assigneeId?: string;
      creditDate?: string;
      delta?: number;
      note?: string;
    };
    const assigneeId = body.assigneeId?.trim() ?? "";
    const creditDate = body.creditDate?.trim() || getTodayKey();
    const delta = clampDesignerDoneDelta(body.delta);
    if (
      !DESIGNER_PERFORMANCE_IDS.includes(
        assigneeId as (typeof DESIGNER_PERFORMANCE_IDS)[number]
      )
    ) {
      return NextResponse.json({ error: "assigneeId required" }, { status: 400 });
    }
    if (delta === null) {
      return NextResponse.json(
        { error: "delta must be −4 to −1 or +1 to +4" },
        { status: 400 }
      );
    }

    const adjustment = await createDesignerDoneAdjustment({
      assigneeId,
      creditDate,
      delta,
      note: body.note,
      createdBy: session.username,
    });
    invalidateDesignerPerformanceLiteCache();
    return NextResponse.json({ ok: true, adjustment });
  } catch (err) {
    console.error("[designer-done-adjustments] POST", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const ok = await deleteDesignerDoneAdjustment(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  invalidateDesignerPerformanceLiteCache();
  return NextResponse.json({ ok: true });
}
