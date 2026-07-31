import { NextRequest, NextResponse } from "next/server";
import { evaluateAndSendDesignerNudges } from "@/lib/team-designer-nudges";

export const runtime = "nodejs";

/**
 * Designer daily-target WhatsApp nudges (Meta Cloud API when configured).
 * Schedules (UTC → IST): 06:30→12:00, 09:30→15:00, 12:30→18:00
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")?.trim() || "";
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  const secret =
    req.headers.get("x-cron-secret")?.trim() ||
    req.nextUrl.searchParams.get("secret")?.trim() ||
    bearer ||
    "";
  const expected =
    process.env.CRON_SECRET?.trim() ||
    process.env.DAILY_OFFERS_CRON_SECRET?.trim() ||
    process.env.CHAT_ATTACHMENTS_CRON_SECRET?.trim() ||
    process.env.TEAM_HANDOFF_CRON_SECRET?.trim() ||
    process.env.DESIGNER_NUDGE_CRON_SECRET?.trim() ||
    "";
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await evaluateAndSendDesignerNudges();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cron/designer-nudges]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message.slice(0, 240) : "Failed" },
      { status: 500 }
    );
  }
}
