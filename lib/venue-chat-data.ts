import { prisma } from "@/lib/db";
import { BRANDS, getVenueLabelsFromCatalog } from "@/lib/brands";
import { getDiscountsForBrand } from "@/lib/reservation-discounts";
import { guestEventDateLine } from "@/lib/event-date-display";
import type { VenueChatLeadStatus, VenueChatMessageRole } from "@prisma/client";
import {
  buildGuestGreeting,
} from "@/lib/venue-chat-copy";
import {
  buildQuickActionsMetadata,
  getVenueChatKnowledge,
  type VenueChatKnowledge,
} from "@/lib/venue-chat-knowledge";
import { randomBytes } from "crypto";
import { sanitizeGuestName } from "@/lib/venue-chat-guest";
import {
  autoDisplayLabelForGuestName,
  isDefaultLeadLabel,
} from "@/lib/venue-chat-lead-labels";

export type WeekOffer = {
  id: string;
  imageUrl: string;
  title: string | null;
  description: string | null;
  eventDate: string | null;
  eventContinuous: boolean;
  dateLine: string;
  entryLabel: string | null;
  capacityText: string | null;
};

export type ChatLeadSnapshot = {
  id: string;
  brandId: string;
  sessionToken: string;
  displayLabel: string;
  guestName: string | null;
  contactNumber: string | null;
  partySize: number | null;
  selectedEventId: string | null;
  selectedEventName: string | null;
  bookingDate: string | null;
  bookingTime: string | null;
  selectedDiscounts: string[];
  status: VenueChatLeadStatus;
  reservationId: string | null;
};

export type FlyerCarouselItem = {
  id: string;
  imageUrl: string;
  title?: string | null;
  dateLine?: string | null;
};

export type ChatMessageDto = {
  id: string;
  role: VenueChatMessageRole;
  content: string;
  imageUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

function startOfTodayUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function parseOfferDate(iso: string | null | undefined): Date | null {
  if (!iso?.trim()) return null;
  const ymd = iso.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, mo, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, day));
}

/** Active offers for this venue — prioritise this calendar week + ongoing. */
export async function getWeekOffersForBrand(brandId: string): Promise<WeekOffer[]> {
  const venue = await prisma.venue.findUnique({
    where: { brandId },
    include: {
      offers: {
        where: {
          OR: [{ endDate: null }, { endDate: { gt: new Date().toISOString() } }],
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const today = startOfTodayUtc();
  const weekEnd = new Date(today);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const raw = venue?.offers ?? [];
  const filtered = raw.filter((o) => {
    if (o.eventContinuous) return true;
    const d = parseOfferDate(o.eventDate);
    if (!d) return true;
    return d >= today && d <= weekEnd;
  });

  const list = filtered.length > 0 ? filtered : raw.slice(0, 6);

  return list.map((o) => ({
    id: o.id,
    imageUrl: o.imageUrl,
    title: o.title,
    description: o.description,
    eventDate: o.eventDate,
    eventContinuous: Boolean(o.eventContinuous),
    dateLine: guestEventDateLine(o.eventDate, { eventContinuous: o.eventContinuous }),
    entryLabel: o.entryLabel ?? null,
    capacityText: o.capacityText ?? null,
  }));
}

export function chatCookieName(brandId: string): string {
  return `bassik_chat_${brandId}`;
}

export function newSessionToken(): string {
  return randomBytes(24).toString("hex");
}

async function nextDisplayLabel(brandId: string): Promise<string> {
  const count = await prisma.venueChatLead.count({ where: { brandId } });
  return `Lead ${count + 1}`;
}

export type UtmParams = {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
};

export async function getOrCreateLead(
  brandId: string,
  sessionToken: string | null,
  utm?: UtmParams
): Promise<{ lead: ChatLeadSnapshot; isNew: boolean }> {
  if (sessionToken) {
    const existing = await prisma.venueChatLead.findUnique({
      where: { sessionToken },
    });
    if (existing && existing.brandId === brandId) {
      return { lead: toSnapshot(existing), isNew: false };
    }
  }

  const venue = await prisma.venue.findUnique({ where: { brandId }, select: { id: true } });
  const token = newSessionToken();
  const displayLabel = await nextDisplayLabel(brandId);

  const created = await prisma.venueChatLead.create({
    data: {
      brandId,
      venueId: venue?.id ?? null,
      displayLabel,
      sessionToken: token,
      utmSource: utm?.utmSource?.slice(0, 120) ?? null,
      utmMedium: utm?.utmMedium?.slice(0, 120) ?? null,
      utmCampaign: utm?.utmCampaign?.slice(0, 120) ?? null,
      utmContent: utm?.utmContent?.slice(0, 120) ?? null,
    },
  });

  return { lead: toSnapshot(created), isNew: true };
}

function toSnapshot(row: {
  id: string;
  brandId: string;
  sessionToken: string;
  displayLabel: string;
  guestName: string | null;
  contactNumber: string | null;
  partySize: number | null;
  selectedEventId: string | null;
  selectedEventName: string | null;
  bookingDate: string | null;
  bookingTime: string | null;
  selectedDiscounts: unknown;
  status: VenueChatLeadStatus;
  reservationId: string | null;
}): ChatLeadSnapshot {
  let discounts: string[] = [];
  if (Array.isArray(row.selectedDiscounts)) {
    discounts = row.selectedDiscounts.filter((x): x is string => typeof x === "string");
  }
  return {
    id: row.id,
    brandId: row.brandId,
    sessionToken: row.sessionToken,
    displayLabel: row.displayLabel,
    guestName: sanitizeGuestName(row.guestName),
    contactNumber: row.contactNumber,
    partySize: row.partySize,
    selectedEventId: row.selectedEventId,
    selectedEventName: row.selectedEventName,
    bookingDate: row.bookingDate,
    bookingTime: row.bookingTime,
    selectedDiscounts: discounts,
    status: row.status,
    reservationId: row.reservationId,
  };
}

export async function appendMessage(
  leadId: string,
  role: VenueChatMessageRole,
  content: string,
  imageUrl?: string | null,
  metadata?: Record<string, unknown> | null
): Promise<ChatMessageDto> {
  const msg = await prisma.venueChatMessage.create({
    data: {
      leadId,
      role,
      content,
      imageUrl: imageUrl ?? null,
      metadata: (metadata ?? undefined) as Parameters<typeof prisma.venueChatMessage.create>[0]["data"]["metadata"],
    },
  });
  await prisma.venueChatLead.update({
    where: { id: leadId },
    data: { lastMessageAt: new Date() },
  });
  return {
    id: msg.id,
    role: msg.role,
    content: msg.content,
    imageUrl: msg.imageUrl,
    metadata: (msg.metadata as Record<string, unknown> | null) ?? null,
    createdAt: msg.createdAt.toISOString(),
  };
}

function mapMessageRows(
  rows: {
    id: string;
    role: VenueChatMessageRole;
    content: string;
    imageUrl: string | null;
    metadata: unknown;
    createdAt: Date;
  }[]
): ChatMessageDto[] {
  return rows.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    imageUrl: m.imageUrl,
    metadata: (m.metadata as Record<string, unknown> | null) ?? null,
    createdAt: m.createdAt.toISOString(),
  }));
}

/** Messages after a cursor id — reliable for live chat polling. */
export async function getMessagesAfter(
  leadId: string,
  afterMessageId: string | null | undefined
): Promise<ChatMessageDto[]> {
  const afterId = afterMessageId?.trim();
  if (!afterId) return [];

  const anchor = await prisma.venueChatMessage.findFirst({
    where: { id: afterId, leadId },
    select: { createdAt: true },
  });
  if (!anchor) return getMessages(leadId);

  const rows = await prisma.venueChatMessage.findMany({
    where: {
      leadId,
      OR: [
        { createdAt: { gt: anchor.createdAt } },
        { createdAt: anchor.createdAt, id: { gt: afterId } },
      ],
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return mapMessageRows(rows);
}

/** @deprecated Prefer getMessagesAfter — timestamp cursors can miss messages. */
export async function getMessagesSince(leadId: string, sinceIso: string): Promise<ChatMessageDto[]> {
  const since = new Date(sinceIso);
  if (Number.isNaN(since.getTime())) return getMessages(leadId);

  const rows = await prisma.venueChatMessage.findMany({
    where: { leadId, createdAt: { gt: since } },
    orderBy: { createdAt: "asc" },
  });
  return mapMessageRows(rows);
}

export async function getLeadSnapshot(leadId: string): Promise<ChatLeadSnapshot | null> {
  const row = await prisma.venueChatLead.findUnique({ where: { id: leadId } });
  return row ? toSnapshot(row) : null;
}

export async function shouldSkipAiForLead(leadId: string): Promise<{
  skip: boolean;
  reason: "closed" | "handed_off" | "ai_disabled" | null;
}> {
  const lead = await prisma.venueChatLead.findUnique({
    where: { id: leadId },
    select: { status: true, brandId: true },
  });
  if (!lead) return { skip: true, reason: "closed" };
  if (lead.status === "CLOSED") return { skip: true, reason: "closed" };
  if (lead.status === "HANDED_OFF") return { skip: true, reason: "handed_off" };

  const { isVenueAiEnabled } = await import("@/lib/venue-chat-config");
  const aiEnabled = await isVenueAiEnabled(lead.brandId);
  if (!aiEnabled) return { skip: true, reason: "ai_disabled" };
  return { skip: false, reason: null };
}

export async function getMessages(leadId: string): Promise<ChatMessageDto[]> {
  const rows = await prisma.venueChatMessage.findMany({
    where: { leadId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    imageUrl: m.imageUrl,
    metadata: (m.metadata as Record<string, unknown> | null) ?? null,
    createdAt: m.createdAt.toISOString(),
  }));
}

export type LeadFieldUpdates = {
  guestName?: string | null;
  contactNumber?: string | null;
  partySize?: number | null;
  selectedEventId?: string | null;
  selectedEventName?: string | null;
  bookingDate?: string | null;
  bookingTime?: string | null;
  selectedDiscounts?: string[] | null;
  status?: VenueChatLeadStatus;
};

export async function updateLeadFields(leadId: string, updates: LeadFieldUpdates): Promise<ChatLeadSnapshot> {
  const data: Record<string, unknown> = {};

  if (updates.guestName !== undefined) {
    const newName = updates.guestName ? sanitizeGuestName(updates.guestName) : null;
    data.guestName = newName;

    if (newName) {
      const current = await prisma.venueChatLead.findUnique({
        where: { id: leadId },
        select: { guestName: true, displayLabel: true, brandId: true },
      });
      const hadName = sanitizeGuestName(current?.guestName);
      if (!hadName && current && isDefaultLeadLabel(current.displayLabel)) {
        data.displayLabel = await autoDisplayLabelForGuestName(
          current.brandId,
          leadId,
          newName
        );
      }
    }
  }

  if (updates.contactNumber !== undefined) data.contactNumber = updates.contactNumber;
  if (updates.partySize !== undefined) data.partySize = updates.partySize;
  if (updates.selectedEventId !== undefined) data.selectedEventId = updates.selectedEventId;
  if (updates.selectedEventName !== undefined) data.selectedEventName = updates.selectedEventName;
  if (updates.bookingDate !== undefined) data.bookingDate = updates.bookingDate;
  if (updates.bookingTime !== undefined) data.bookingTime = updates.bookingTime;
  if (updates.selectedDiscounts !== undefined) {
    data.selectedDiscounts = updates.selectedDiscounts;
  }
  if (updates.status !== undefined) data.status = updates.status;

  const row = await prisma.venueChatLead.update({
    where: { id: leadId },
    data,
  });
  return toSnapshot(row);
}

export async function seedWelcomeThread(
  leadId: string,
  brandId: string,
  offers: WeekOffer[],
  knowledge?: VenueChatKnowledge
): Promise<ChatMessageDto[]> {
  const k = knowledge ?? (await getVenueChatKnowledge(brandId));
  const venueName = k.venueName;
  const now = new Date();

  const greetingContent = buildGuestGreeting(venueName, k.hostName);
  const quickMeta = buildQuickActionsMetadata(k);

  type CreateMsg = Parameters<typeof prisma.venueChatMessage.create>[0]["data"];
  const batch: CreateMsg[] = [
    {
      leadId,
      role: "ASSISTANT",
      content: greetingContent,
      metadata: { type: "welcome_greeting" } as object,
    },
    {
      leadId,
      role: "ASSISTANT",
      content: "",
      metadata: quickMeta as object,
    },
  ];

  if (offers.length === 0) {
    batch.push({
      leadId,
      role: "ASSISTANT",
      content:
        "New events are coming soon — tell me which night you're planning and we'll sort your table.",
    });
  } else {
    const items: FlyerCarouselItem[] = offers.slice(0, 8).map((o) => ({
      id: o.id,
      imageUrl: o.imageUrl,
      title: o.title,
      dateLine: o.dateLine,
    }));
    batch.push({
      leadId,
      role: "ASSISTANT",
      content: "Book any event here — tap one to reserve your spot.",
      metadata: { type: "flyers", items, selectable: true } as object,
    });
  }

  const rows = await prisma.$transaction([
    ...batch.map((data) => prisma.venueChatMessage.create({ data })),
    prisma.venueChatLead.update({
      where: { id: leadId },
      data: { status: "IN_PROGRESS", lastMessageAt: now },
    }),
  ]);

  const msgRows = rows.slice(0, batch.length) as Awaited<
    ReturnType<typeof prisma.venueChatMessage.create>
  >[];

  return msgRows.map((msg) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    imageUrl: msg.imageUrl,
    metadata: (msg.metadata as Record<string, unknown> | null) ?? null,
    createdAt: msg.createdAt.toISOString(),
  }));
}

/** @deprecated use buildVenueKnowledgePrompt from venue-chat-knowledge */
export function discountsBlockForBrand(brandId: string): string {
  const list = getDiscountsForBrand(brandId);
  if (!list.length) return "No preset discounts — book direct for best slots.";
  return list
    .map((d) => `- id: ${d.id} | ${d.label}${d.description ? ` (${d.description})` : ""}`)
    .join("\n");
}

/** @deprecated use buildVenueKnowledgePrompt from venue-chat-knowledge */
export function venueContextForPrompt(brandId: string, offers: WeekOffer[]): string {
  const brand = BRANDS.find((b) => b.id === brandId);
  const lines = offers.map(
    (o) =>
      `id=${o.id} | ${o.title ?? "Event"} | ${o.dateLine}${o.description ? ` | ${o.description}` : ""}${o.entryLabel ? ` | entry: ${o.entryLabel}` : ""}${o.capacityText ? ` | ${o.capacityText}` : ""}`
  );
  return [
    `Venue: ${brand?.name ?? brandId} (${brand?.shortName ?? brandId})`,
    brand?.description ? `Vibe: ${brand.description}` : "",
    "Events this week:",
    lines.length ? lines.join("\n") : "(none listed — still help with booking)",
    "Available discounts (guest picks by id):",
    discountsBlockForBrand(brandId),
  ]
    .filter(Boolean)
    .join("\n");
}

export async function tryFinalizeBooking(leadId: string): Promise<{ ok: boolean; reservationId?: string }> {
  const lead = await prisma.venueChatLead.findUnique({ where: { id: leadId } });
  if (!lead || lead.reservationId) return { ok: false };

  const name = sanitizeGuestName(lead.guestName);
  const phone = lead.contactNumber?.replace(/\D/g, "").slice(-10);
  const party = lead.partySize;
  const date = lead.bookingDate;
  const time = lead.bookingTime;

  if (!name || !phone || phone.length !== 10 || !party || party < 1 || !date || !time) {
    return { ok: false };
  }

  const brand = BRANDS.find((b) => b.id === lead.brandId);
  const venue = await prisma.venue.findUnique({ where: { brandId: lead.brandId } });
  if (!venue) {
    await prisma.venueChatLead.update({
      where: { id: leadId },
      data: { status: "BOOKING_STARTED" },
    });
    return { ok: false };
  }

  const { shortName } = getVenueLabelsFromCatalog(lead.brandId, venue.name, venue.shortName);
  let discountIds: string[] = [];
  if (Array.isArray(lead.selectedDiscounts)) {
    discountIds = lead.selectedDiscounts.filter((x): x is string => typeof x === "string");
  }

  const reservation = await prisma.reservation.create({
    data: {
      venueId: venue.id,
      brandId: lead.brandId,
      brandName: shortName,
      fullName: name,
      contactNumber: phone,
      numberOfMen: String(party),
      numberOfWomen: "0",
      numberOfCouples: "0",
      date,
      timeSlot: time,
      notes: [
        `Chat lead ${lead.displayLabel}`,
        lead.selectedEventName ? `Event: ${lead.selectedEventName}` : null,
        lead.selectedEventId ? `Event ID: ${lead.selectedEventId}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      selectedDiscounts: discountIds.length ? JSON.stringify(discountIds) : null,
      status: "PENDING",
    },
  });

  await prisma.venueChatLead.update({
    where: { id: leadId },
    data: {
      reservationId: reservation.id,
      status: "BOOKED",
    },
  });

  return { ok: true, reservationId: reservation.id };
}

export async function listLeadsForManager(brandId?: string | null) {
  const rows = await prisma.venueChatLead.findMany({
    where: brandId ? { brandId } : undefined,
    orderBy: { lastMessageAt: "desc" },
    take: 200,
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    brandId: r.brandId,
    displayLabel: r.displayLabel,
    guestName: r.guestName,
    contactNumber: r.contactNumber,
    partySize: r.partySize,
    selectedEventName: r.selectedEventName,
    bookingDate: r.bookingDate,
    bookingTime: r.bookingTime,
    reservationId: r.reservationId,
    managerNotes: r.managerNotes,
    status: r.status,
    lastMessageAt: r.lastMessageAt.toISOString(),
    preview: r.messages[0]?.content?.slice(0, 120) ?? "",
    utmSource: r.utmSource,
    utmMedium: r.utmMedium,
    utmCampaign: r.utmCampaign,
    utmContent: r.utmContent,
  }));
}
