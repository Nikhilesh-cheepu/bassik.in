import { prisma } from "@/lib/db";
import { BRANDS } from "@/lib/brands";
import { normalizePhone } from "@/lib/automation/phone";
import { sendTwilioWhatsAppMessage } from "@/lib/automation/twilio-whatsapp";
import { getVenueDataByBrandId } from "@/lib/venue-data";

const DAILY_MARKER = "[BASSIK_DAILY_6AM]";
const DEFAULT_MAX_RECIPIENTS = 2000;
const SEND_DELAY_MS = 700;

function inferBaseUrl(): string {
  // Works in local + Vercel.
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function formatOutletList(outlets: { brandId: string; shortName: string; tag?: string }[]): string {
  return outlets
    .map((o) => `• ${o.shortName}${o.tag ? ` (${o.tag})` : ""}`)
    .slice(0, 10)
    .join("\n");
}

function pickDailyMessage(params: {
  fullName?: string | null;
  outlets: { brandId: string; shortName: string; tag?: string }[];
}): string {
  const name = (params.fullName || "").trim() ? params.fullName!.trim() : "there";
  const outletsText = formatOutletList(params.outlets);

  // Keep it compact for WhatsApp.
  return (
    `${DAILY_MARKER}\n` +
    `Hi ${name}! Bassik website-only deals are live today at our outlets:\n${outletsText}\n\n` +
    `Reply with the outlet you want to book (or say “offers”). I’ll share the booking link + best time.`
  );
}

export async function sendDailyOffers(params?: {
  maxRecipients?: number;
}): Promise<{
  ok: boolean;
  attempted: number;
  sent: number;
  failed: number;
  marker: string;
}> {
  const maxRecipients = params?.maxRecipients ?? DEFAULT_MAX_RECIPIENTS;

  // Compute outlet data (offers are per-venue in DB).
  // We keep this lightweight: list outlets + whether offers exist (not full images).
  const outlets = await Promise.all(
    BRANDS.map(async (b) => {
      try {
        // venue-data pulls offers via prisma and also returns whatsappMessage.
        const v = await getVenueDataByBrandId(b.id);
        return {
          brandId: b.id,
          shortName: b.shortName,
          tag: b.tag,
          hasOffers: Boolean(v?.offers?.length),
        };
      } catch {
        return { brandId: b.id, shortName: b.shortName, tag: b.tag, hasOffers: false };
      }
    })
  );

  const outletsForMessage = outlets.map((o) => ({
    brandId: o.brandId,
    shortName: o.shortName,
    tag: o.tag,
  }));

  // Candidate recipients:
  // - AutomationContact (imported lists)
  // - Reservations (guests)
  // We'll dedupe by phone.
  const candidates = new Map<string, { phone: string; fullName: string | null }>();

  const importContacts = await prisma.automationContact.findMany({
    take: maxRecipients,
    select: { phone: true, fullName: true },
  });
  for (const c of importContacts) {
    const phone = normalizePhone(c.phone);
    if (!phone || phone.length < 5) continue;
    candidates.set(phone, { phone, fullName: c.fullName ?? null });
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const reservationGuests = await prisma.reservation.findMany({
    where: {
      // Keep it simple: only those with a date today or later, and not cancelled.
      status: { not: "CANCELLED" as any },
      date: { gte: todayStr },
    },
    take: maxRecipients,
    select: { contactNumber: true, fullName: true },
  });
  for (const r of reservationGuests) {
    const phone = normalizePhone(r.contactNumber);
    if (!phone || phone.length < 5) continue;
    if (!candidates.has(phone)) {
      candidates.set(phone, { phone, fullName: r.fullName ?? null });
    }
  }

  const allPhones = Array.from(candidates.keys()).slice(0, maxRecipients);

  // Dedup: do not send again if we already sent the daily marker today.
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const alreadySent = await prisma.automationWhatsAppMessage.findMany({
    where: {
      toPhone: { in: allPhones },
      createdAt: { gte: startOfDay },
      body: { startsWith: DAILY_MARKER },
    },
    select: { toPhone: true },
  });
  const alreadySet = new Set(alreadySent.map((x) => x.toPhone));

  const toSend = allPhones.filter((p) => !alreadySet.has(p)).slice(0, maxRecipients);

  // Safety: if Twilio not configured, fail early.
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_FROM) {
    return { ok: false, attempted: toSend.length, sent: 0, failed: toSend.length, marker: DAILY_MARKER };
  }

  let sent = 0;
  let failed = 0;
  let attempted = 0;

  for (const phone of toSend) {
    attempted += 1;
    const c = candidates.get(phone)!;
    const body = pickDailyMessage({ fullName: c.fullName, outlets: outletsForMessage });

    const tw = await sendTwilioWhatsAppMessage(phone, body);
    await prisma.automationWhatsAppMessage.create({
      data: {
        contactId: null,
        toPhone: phone,
        body,
        status: tw.ok ? "SENT" : "FAILED",
        providerSid: tw.ok ? tw.sid : null,
        error: tw.ok ? null : tw.error,
      },
    });

    if (tw.ok) sent += 1;
    else failed += 1;

    await new Promise((resolve) => setTimeout(resolve, SEND_DELAY_MS));
  }

  // Base url is computed so the AI can reuse booking links if needed later.
  // Not used directly in the message for now.
  void inferBaseUrl();

  return { ok: true, attempted, sent, failed, marker: DAILY_MARKER };
}

