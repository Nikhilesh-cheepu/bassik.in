import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import {
  filterTeamReminders,
  parseReminderPayload,
  teamReminderOwnerId,
  toTeamReminderDto,
  type TeamReminderFilter,
} from "@/lib/team-reminders";
import { prisma } from "@/lib/db";

const FILTERS = new Set<TeamReminderFilter>(["all", "todo", "done"]);

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filter = (req.nextUrl.searchParams.get("filter") as TeamReminderFilter) || "todo";
  const safeFilter = FILTERS.has(filter) ? filter : "todo";
  const ownerId = teamReminderOwnerId(session);

  const rows = await prisma.teamReminder.findMany({
    where: { ownerId },
    orderBy: [{ status: "asc" }, { deadlineDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    reminders: filterTeamReminders(rows, safeFilter).map(toTeamReminderDto),
    filter: safeFilter,
  });
}

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = parseReminderPayload(body);
  const finalTitle = parsed.title || parsed.description?.slice(0, 80) || "Reminder";
  if (finalTitle.length > 200) {
    return NextResponse.json({ error: "Title too long" }, { status: 400 });
  }

  const row = await prisma.teamReminder.create({
    data: {
      ownerId: teamReminderOwnerId(session),
      title: finalTitle,
      description: parsed.description,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      deadlineDate: parsed.deadlineDate,
      deadlineTime: parsed.deadlineTime,
    },
  });

  return NextResponse.json({ reminder: toTeamReminderDto(row) });
}
