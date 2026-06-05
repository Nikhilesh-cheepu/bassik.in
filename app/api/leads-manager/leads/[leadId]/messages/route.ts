import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLeadsManagerFromRequest } from "@/lib/leads-manager-auth";
import { appendLearnedExample } from "@/lib/venue-chat-config";
import { buildManagerShortcut } from "@/lib/leads-manager-shortcuts-server";
import type { ManagerShortcutId } from "@/lib/leads-manager-shortcuts";
import { appendMessage, getLeadSnapshot, getMessagesSince } from "@/lib/venue-chat-data";
import { getVenueChatKnowledge } from "@/lib/venue-chat-knowledge";
import { polishManagerMessage } from "@/lib/venue-chat-manager-polish";
import { BRANDS } from "@/lib/brands";

const SHORTCUT_IDS = new Set<ManagerShortcutId>([
  "book_table",
  "book_event",
  "venue_page",
  "menu_page",
  "directions",
  "whatsapp",
  "follow_up",
  "thanks",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  if (!(await getLeadsManagerFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { leadId } = await params;
  const body = await req.json().catch(() => ({}));

  const leadRow = await prisma.venueChatLead.findUnique({ where: { id: leadId } });
  if (!leadRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const shortcut =
    typeof body.shortcut === "string" && SHORTCUT_IDS.has(body.shortcut as ManagerShortcutId)
      ? (body.shortcut as ManagerShortcutId)
      : null;
  const text = typeof body.message === "string" ? body.message.trim() : "";
  const skipPolish = body.polish === false;
  const customMeta =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : null;

  const knowledge = await getVenueChatKnowledge(leadRow.brandId);
  const brand = BRANDS.find((b) => b.id === leadRow.brandId);

  let content = text;
  let metadata: Record<string, unknown> = { sentBy: "manager" };

  if (shortcut) {
    const lead = (await getLeadSnapshot(leadId)) ?? {
      brandId: leadRow.brandId,
      guestName: leadRow.guestName,
      selectedEventId: leadRow.selectedEventId,
      selectedEventName: leadRow.selectedEventName,
      contactNumber: leadRow.contactNumber,
      mapUrl: knowledge.mapUrl,
    };
    const built = buildManagerShortcut(shortcut, {
      brandId: lead.brandId,
      guestName: lead.guestName,
      selectedEventId: lead.selectedEventId,
      selectedEventName: lead.selectedEventName,
      contactNumber: leadRow.contactNumber,
      mapUrl: knowledge.mapUrl,
    });
    if (!built) {
      return NextResponse.json(
        {
          error:
            shortcut === "book_event"
              ? "Guest has no event selected"
              : shortcut === "whatsapp"
                ? "WhatsApp link unavailable"
                : "Shortcut unavailable",
        },
        { status: 400 }
      );
    }
    content = built.content;
    metadata = built.metadata;
  } else if (text && customMeta) {
    metadata = { ...customMeta, sentBy: "manager" };
  } else if (!text) {
    return NextResponse.json({ error: "Message or shortcut required" }, { status: 400 });
  }

  if (!skipPolish) {
    content = await polishManagerMessage(content, {
      guestName: leadRow.guestName,
      venueName: brand?.shortName ?? knowledge.venueName,
    });
  }

  const lastUser = await prisma.venueChatMessage.findFirst({
    where: { leadId, role: "USER" },
    orderBy: { createdAt: "desc" },
    select: { content: true },
  });

  const msg = await appendMessage(leadId, "ASSISTANT", content.slice(0, 1200), null, metadata);

  if (lastUser?.content?.trim() && !shortcut) {
    appendLearnedExample(leadRow.brandId, lastUser.content, content).catch((e) =>
      console.error("[learned-example]", e)
    );
  }

  return NextResponse.json({ message: msg });
}
