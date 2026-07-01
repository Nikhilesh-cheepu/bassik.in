import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";
import {
  canManageCalendarEvents,
  parseCalendarEventPayload,
  toTeamCalendarEventDto,
} from "@/lib/team-calendar";

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageCalendarEvents(session)) {
    return NextResponse.json({ error: "Only admin can add calendar events" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = parseCalendarEventPayload(body as Record<string, unknown>);
  if (!parsed.title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  if (!parsed.date) return NextResponse.json({ error: "Valid date required" }, { status: 400 });
  if (parsed.endDate && parsed.endDate < parsed.date) {
    return NextResponse.json({ error: "End date must be on or after start" }, { status: 400 });
  }

  try {
    const row = await prisma.teamCalendarEvent.create({
      data: {
        type: parsed.type,
        title: parsed.title,
        description: parsed.description,
        date: parsed.date,
        endDate: parsed.endDate,
        outletId: parsed.outletId,
        createdBy: session.username,
      },
    });
    return NextResponse.json({ event: toTeamCalendarEventDto(row) });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team calendar events POST]", error);
    return NextResponse.json({ error: "Could not create event" }, { status: 500 });
  }
}
