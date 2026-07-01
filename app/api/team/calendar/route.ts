import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";
import {
  buildCalendarEntries,
  calendarViewerId,
  canManageCalendarEvents,
  normalizeCalendarDate,
  parseDateKeys,
  type CalendarEntryKind,
} from "@/lib/team-calendar";

async function sharedDatesForMember(memberId: string): Promise<Set<string>> {
  const rows = await prisma.teamCalendarShareMember.findMany({
    where: { memberId },
    include: { share: true },
  });
  const keys = new Set<string>();
  for (const row of rows) {
    for (const d of parseDateKeys(row.share.dateKeys)) keys.add(d);
  }
  return keys;
}

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Calendar not available for viewers" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const from = normalizeCalendarDate(sp.get("from")) ?? "";
  const to = normalizeCalendarDate(sp.get("to")) ?? "";
  if (!from || !to || from > to) {
    return NextResponse.json({ error: "from and to (YYYY-MM-DD) required" }, { status: 400 });
  }

  const outletId = sp.get("outletId")?.trim() || undefined;
  const kindsRaw = sp.get("kinds");
  const kinds = kindsRaw
    ? (kindsRaw.split(",").filter(Boolean) as CalendarEntryKind[])
    : undefined;

  const viewerId = calendarViewerId(session);
  const isAdmin = session.role === "admin";

  try {
    const sharedDateKeys =
      isAdmin ? new Set<string>() : await sharedDatesForMember(viewerId);

    const [tasks, events, planningNotes] = await Promise.all([
      prisma.teamAdTask.findMany({
        where: outletId ? { outletId } : undefined,
        orderBy: { createdAt: "desc" },
      }),
      prisma.teamCalendarEvent.findMany({
        where: {
          date: { lte: to },
          OR: [{ endDate: { gte: from } }, { endDate: null, date: { gte: from } }],
          ...(outletId ? { outletId } : {}),
        },
      }),
      isAdmin || sharedDateKeys.size > 0
        ? prisma.teamPlanningNote.findMany({ orderBy: { createdAt: "desc" }, take: 200 })
        : Promise.resolve([]),
    ]);

    const entries = buildCalendarEntries({
      from,
      to,
      session,
      sharedDateKeys,
      tasks,
      events,
      planningNotes,
      outletId,
      kinds,
    });

    return NextResponse.json({
      entries,
      from,
      to,
      isAdmin,
      sharedDateKeys: isAdmin ? [] : [...sharedDateKeys].sort(),
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team calendar GET]", error);
    return NextResponse.json({ error: "Could not load calendar" }, { status: 500 });
  }
}
