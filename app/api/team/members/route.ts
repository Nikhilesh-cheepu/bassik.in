import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { teamMembersForClient } from "@/lib/team-members";

export async function GET(req: NextRequest) {
  if (!(await getTeamFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ members: teamMembersForClient() });
}
