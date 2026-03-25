import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/automation/phone";
import {
  sendTwilioWhatsAppMessage,
  twilioWhatsAppErrorHint,
} from "@/lib/automation/twilio-whatsapp";

export const runtime = "nodejs";
export const maxDuration = 120;

const DELAY_MS = 700;
const MAX_PER_REQUEST = 100;

/** Twilio connection check (no secrets returned). */
export async function GET() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromRaw = process.env.TWILIO_WHATSAPP_FROM?.trim();
  const configured = Boolean(accountSid && authToken && fromRaw);
  let fromMasked: string | null = null;
  if (fromRaw) {
    const digits = fromRaw.replace(/\D/g, "");
    fromMasked =
      digits.length >= 4
        ? `…${digits.slice(-4)}`
        : fromRaw.startsWith("whatsapp:")
          ? "whatsapp:…"
          : "set";
  }
  return NextResponse.json({
    configured,
    accountSidSuffix: accountSid && accountSid.length > 2 ? accountSid.slice(-4) : null,
    fromMasked,
    maxContactsPerRequest: MAX_PER_REQUEST,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      message?: string;
      contactIds?: string[];
      testPhone?: string;
    };

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json({ error: "message is required." }, { status: 400 });
    }

    if (body.testPhone && typeof body.testPhone === "string") {
      const phone = normalizePhone(body.testPhone.trim());
      if (!phone) {
        return NextResponse.json({ error: "testPhone is not a valid number." }, { status: 400 });
      }

      const r = await sendTwilioWhatsAppMessage(phone, message);
      await prisma.automationWhatsAppMessage.create({
        data: {
          contactId: null,
          toPhone: phone,
          body: message,
          status: r.ok ? "SENT" : "FAILED",
          providerSid: r.ok ? r.sid : null,
          error: r.ok ? null : r.error,
        },
      });

      if (!r.ok) {
        return NextResponse.json(
          {
            error: r.error,
            twilioCode: r.code,
            hint: twilioWhatsAppErrorHint(r.code),
            twilioConfigured: Boolean(process.env.TWILIO_ACCOUNT_SID),
          },
          { status: 422 }
        );
      }
      return NextResponse.json({ ok: true, mode: "test", sid: r.sid });
    }

    const ids = Array.isArray(body.contactIds) ? body.contactIds.filter((x) => typeof x === "string") : [];
    if (ids.length === 0) {
      return NextResponse.json(
        { error: "Provide contactIds[] or testPhone for a one-off test." },
        { status: 400 }
      );
    }
    if (ids.length > MAX_PER_REQUEST) {
      return NextResponse.json(
        { error: `Maximum ${MAX_PER_REQUEST} contacts per request. Send in batches from the UI.` },
        { status: 400 }
      );
    }

    const contacts = await prisma.automationContact.findMany({
      where: { id: { in: ids } },
      select: { id: true, phone: true },
    });

    const results: { contactId: string; ok: boolean; error?: string; sid?: string }[] = [];

    for (const c of contacts) {
      const r = await sendTwilioWhatsAppMessage(c.phone, message);
      await prisma.automationWhatsAppMessage.create({
        data: {
          contactId: c.id,
          toPhone: c.phone,
          body: message,
          status: r.ok ? "SENT" : "FAILED",
          providerSid: r.ok ? r.sid : null,
          error: r.ok ? null : r.error,
        },
      });
      results.push({
        contactId: c.id,
        ok: r.ok,
        error: r.ok ? undefined : r.error,
        sid: r.ok ? r.sid : undefined,
      });
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }

    const sent = results.filter((x) => x.ok).length;
    const failed = results.length - sent;

    return NextResponse.json({
      ok: failed === 0,
      sent,
      failed,
      results,
      twilioConfigured: Boolean(process.env.TWILIO_ACCOUNT_SID),
    });
  } catch (e) {
    console.error("[automations/whatsapp]", e);
    return NextResponse.json({ error: "WhatsApp send failed." }, { status: 500 });
  }
}
