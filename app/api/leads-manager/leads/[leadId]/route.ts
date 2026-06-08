import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLeadsManagerFromRequest } from "@/lib/leads-manager-auth";
import { deleteVenueChatLead, getLeadSnapshot, getMessages, getMessagesAfter, getMessagesSince } from "@/lib/venue-chat-data";
import type { VenueChatLeadStatus } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  if (!(await getLeadsManagerFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { leadId } = await params;
  const after = req.nextUrl.searchParams.get("after");
  const since = req.nextUrl.searchParams.get("since");
  const lead = await getLeadSnapshot(leadId);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (after || since) {
    const delta = after
      ? await getMessagesAfter(leadId, after)
      : await getMessagesSince(leadId, since!);
    return NextResponse.json({ lead, messages: delta, delta: true });
  }

  const messages = await getMessages(leadId);
  return NextResponse.json({ lead, messages });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  if (!(await getLeadsManagerFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { leadId } = await params;
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  const allowed: VenueChatLeadStatus[] = [
    "NEW",
    "IN_PROGRESS",
    "BOOKING_STARTED",
    "BOOKED",
    "HANDED_OFF",
    "CLOSED",
  ];
  if (typeof body.status === "string" && allowed.includes(body.status as VenueChatLeadStatus)) {
    data.status = body.status;
  }
  if (typeof body.managerNotes === "string") {
    data.managerNotes = body.managerNotes.slice(0, 500);
  }
  if (typeof body.displayLabel === "string") {
    const label = body.displayLabel.trim().slice(0, 40);
    if (label.length >= 1) data.displayLabel = label;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  const lead = await prisma.venueChatLead.update({ where: { id: leadId }, data });
  return NextResponse.json({ lead });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  if (!(await getLeadsManagerFromRequest(_req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { leadId } = await params;
  const existing = await getLeadSnapshot(leadId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ok = await deleteVenueChatLead(leadId);
  if (!ok) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, deletedLeadId: leadId });
}
