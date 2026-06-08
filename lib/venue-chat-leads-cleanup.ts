import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  autoDisplayLabelForGuestName,
  isDefaultLeadLabel,
} from "@/lib/venue-chat-lead-labels";
import { sanitizeGuestName } from "@/lib/venue-chat-guest";
import { filterManagerThreadView } from "@/lib/venue-chat-ui-helpers";

/** Inbox list preview — skip hidden welcome/event cards. */
export function managerInboxPreview(
  messages: { role: string; content: string; metadata: unknown }[]
): string {
  const asUi = messages.map((m) => ({
    id: "",
    role: m.role,
    content: m.content,
    imageUrl: null,
    metadata: (m.metadata as Record<string, unknown> | null) ?? null,
    createdAt: "",
  }));
  const visible = filterManagerThreadView(asUi);
  const last = visible[visible.length - 1];
  if (last?.content?.trim()) return last.content.trim().slice(0, 120);

  const lastUser = [...messages].reverse().find((m) => m.role === "USER");
  if (lastUser?.content?.trim()) return lastUser.content.trim().slice(0, 120);

  if (messages.length > 0) return "Opened chat — waiting for guest reply";

  return "";
}

/** Leads worth showing in /leads — skip bare “opened chat” test rows. */
export function managerInboxLeadWhere(brandId?: string | null): Prisma.VenueChatLeadWhereInput {
  const base: Prisma.VenueChatLeadWhereInput = brandId ? { brandId } : {};
  return {
    ...base,
    OR: [
      { messages: { some: { role: "USER" } } },
      { messages: { some: { role: "MANAGER" } } },
      { reservationId: { not: null } },
      {
        AND: [{ guestName: { not: null } }, { contactNumber: { not: null } }],
      },
    ],
  };
}

function shouldKeepLead(lead: {
  reservationId: string | null;
  contactNumber: string | null;
  guestName: string | null;
  messages: { role: string }[];
}): boolean {
  if (lead.messages.some((m) => m.role === "USER" || m.role === "MANAGER")) return true;
  if (lead.reservationId) return true;
  const name = sanitizeGuestName(lead.guestName);
  if (name && lead.contactNumber?.replace(/\D/g, "").length === 10) return true;
  return false;
}

function needsSmartRelabel(displayLabel: string, guestName: string | null): boolean {
  const name = sanitizeGuestName(guestName);
  if (!name) return false;
  if (isDefaultLeadLabel(displayLabel)) return true;
  const base = name.split(/\s+/)[0] ?? name;
  if (!displayLabel.toLowerCase().startsWith(base.toLowerCase().slice(0, 3))) return true;
  return false;
}

/** Remove test opens (no guest messages). Relabel kept leads from real names. */
export async function pruneAndRelabelChatLeads(brandId?: string | null): Promise<{
  deletedLeads: number;
  keptLeads: number;
  relabeledLeads: number;
}> {
  const where = brandId ? { brandId } : {};

  const leads = await prisma.venueChatLead.findMany({
    where,
    include: { messages: { select: { role: true } } },
  });

  const deleteIds: string[] = [];
  const relabelTargets: { id: string; brandId: string; guestName: string }[] = [];

  for (const lead of leads) {
    if (!shouldKeepLead(lead)) {
      deleteIds.push(lead.id);
      continue;
    }
    if (needsSmartRelabel(lead.displayLabel, lead.guestName)) {
      const name = sanitizeGuestName(lead.guestName);
      if (name) relabelTargets.push({ id: lead.id, brandId: lead.brandId, guestName: name });
    }
  }

  if (deleteIds.length) {
    await prisma.venueChatLead.deleteMany({ where: { id: { in: deleteIds } } });
  }

  let relabeledLeads = 0;
  for (const t of relabelTargets) {
    const label = await autoDisplayLabelForGuestName(t.brandId, t.id, t.guestName);
    await prisma.venueChatLead.update({
      where: { id: t.id },
      data: { displayLabel: label },
    });
    relabeledLeads += 1;
  }

  return {
    deletedLeads: deleteIds.length,
    keptLeads: leads.length - deleteIds.length,
    relabeledLeads,
  };
}
