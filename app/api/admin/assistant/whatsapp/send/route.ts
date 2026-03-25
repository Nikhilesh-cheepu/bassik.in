import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendTwilioWhatsAppMessage } from "@/lib/automation/twilio-whatsapp";
import {
  applyTemplateToRecipient,
  type GroupSpec,
  resolveRecipientsForGroup,
  countRecipientsForGroup,
} from "@/lib/admin/assistant/automation-group";

export const runtime = "nodejs";
export const maxDuration = 120;

const DELAY_MS = 700;
const MAX_RECIPIENTS = 20_000;
const BATCH_SIZE = 100;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      messageTemplate?: string;
      group?: GroupSpec;
    };

    const template = typeof body.messageTemplate === "string" ? body.messageTemplate.trim() : "";
    const group = body.group;
    if (!template) {
      return NextResponse.json({ error: "messageTemplate is required." }, { status: 400 });
    }
    if (!group || group.importScope !== "all") {
      return NextResponse.json({ error: "group is required (importScope=all)." }, { status: 400 });
    }

    // Resolve count first (also validates gender/age keys existence).
    const countRes = await countRecipientsForGroup(group);
    if (countRes.count <= 0) {
      return NextResponse.json(
        { ok: true, sent: 0, failed: 0, matched: 0, details: "No recipients matched this group." },
        { status: 200 }
      );
    }
    if (countRes.count > MAX_RECIPIENTS) {
      return NextResponse.json(
        {
          error: `This group matches ${countRes.count} recipients, which is above the safety limit (${MAX_RECIPIENTS}). Narrow your filters.`,
          matched: countRes.count,
        },
        { status: 400 }
      );
    }

    // Fetch recipients. For simplicity, we fetch all up to MAX_RECIPIENTS, then send with batching.
    const { recipients } = await resolveRecipientsForGroup(group, countRes.count);

    let sent = 0;
    let failed = 0;
    const results: { phone: string; ok: boolean; error?: string; sid?: string }[] = [];

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const slice = recipients.slice(i, i + BATCH_SIZE);

      for (const r of slice) {
        const personalized = applyTemplateToRecipient(template, { fullName: r.fullName });
        const tw = await sendTwilioWhatsAppMessage(r.phone, personalized);

        await prisma.automationWhatsAppMessage.create({
          data: {
            contactId: r.id,
            toPhone: r.phone,
            body: personalized,
            status: tw.ok ? "SENT" : "FAILED",
            providerSid: tw.ok ? tw.sid : null,
            error: tw.ok ? null : tw.error,
          },
        });

        if (tw.ok) sent += 1;
        else failed += 1;

        results.push({ phone: r.phone, ok: tw.ok, error: tw.ok ? undefined : tw.error, sid: tw.ok ? tw.sid : undefined });
      }

      // Gentle pacing between batches to avoid provider throttling.
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    return NextResponse.json({ ok: failed === 0, sent, failed, matched: recipients.length, results });
  } catch (e) {
    console.error("[assistant-whatsapp-send]", e);
    const msg = e instanceof Error ? e.message : "Send failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

