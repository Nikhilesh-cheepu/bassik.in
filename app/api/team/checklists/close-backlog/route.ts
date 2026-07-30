import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { addDaysYmd, getTodayKey } from "@/lib/team-checklists";
import { CHECKLIST_DEFAULT_OWNER_ID } from "@/lib/team-checklist-templates";
import { closeChecklistBacklogExceptAds } from "@/lib/team-checklist-backlog";
import { teamPersonalNoteOwnerId } from "@/lib/team-personal-notes";

/** Admin: mark stories/posts done through today−2 (ads left open). */
export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      ownerId?: string;
      daysAgo?: number;
    };
    const ownerId =
      typeof body.ownerId === "string" && body.ownerId.trim()
        ? body.ownerId.trim()
        : CHECKLIST_DEFAULT_OWNER_ID;
    const daysAgo =
      typeof body.daysAgo === "number" && body.daysAgo >= 0 ? Math.min(14, body.daysAgo) : 2;
    const cutoffYmd = addDaysYmd(getTodayKey(), -daysAgo);
    const completedBy = teamPersonalNoteOwnerId(session);

    const result = await closeChecklistBacklogExceptAds({
      ownerId,
      cutoffYmd,
      completedBy,
    });

    return NextResponse.json({ ok: true, ...result, ownerId, daysAgo });
  } catch (err) {
    console.error("[checklists/close-backlog]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
