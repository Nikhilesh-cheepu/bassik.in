import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";
import {
  canManageCalendarEvents,
  parseCalendarEventPayload,
  toTeamCalendarEventDto,
} from "@/lib/team-calendar";

type RouteCtx = { params: Promise<{ eventId: string }> };

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageCalendarEvents(session)) {
    return NextResponse.json({ error: "Only admin can edit calendar events" }, { status: 403 });
  }

  const { eventId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = parseCalendarEventPayload(body as Record<string, unknown>);
  if (!parsed.title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  if (!parsed.date) return NextResponse.json({ error: "Valid date required" }, { status: 400 });

  try {
    const row = await prisma.teamCalendarEvent.update({
      where: { id: eventId },
      data: {
        type: parsed.type,
        title: parsed.title,
        description: parsed.description,
        date: parsed.date,
        endDate: parsed.endDate,
        outletId: parsed.outletId,
      },
    });
    return NextResponse.json({ event: toTeamCalendarEventDto(row) });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team calendar events PATCH]", error);
    return NextResponse.json({ error: "Could not update event" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageCalendarEvents(session)) {
    return NextResponse.json({ error: "Only admin can delete calendar events" }, { status: 403 });
  }

  const { eventId } = await ctx.params;
  try {
    await prisma.teamCalendarEvent.delete({ where: { id: eventId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team calendar events DELETE]", error);
    return NextResponse.json({ error: "Could not delete event" }, { status: 500 });
  }
}
