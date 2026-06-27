import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { createTeamAdTask } from "@/lib/team-task-create";
import { isTeamMemberId } from "@/lib/team-members";

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session || session.role !== "member") {
    return NextResponse.json({ error: "Only team members can log work" }, { status: 403 });
  }

  const mid = session.memberId ?? session.username;
  if (!isTeamMemberId(mid)) {
    return NextResponse.json({ error: "Invalid member session" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  try {
    const task = await createTeamAdTask(
      {
        outletId: typeof body.outletId === "string" ? body.outletId : "",
        assigneeId: mid,
        title,
        description: typeof body.description === "string" ? body.description : undefined,
        creativeUrl: typeof body.creativeUrl === "string" ? body.creativeUrl : undefined,
        deadlineDate: typeof body.deadlineDate === "string" ? body.deadlineDate : undefined,
        deadlineTime: typeof body.deadlineTime === "string" ? body.deadlineTime : undefined,
        priority: "NORMAL",
        status: "PENDING_APPROVAL",
      },
      session.username
    );
    return NextResponse.json({ task });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
