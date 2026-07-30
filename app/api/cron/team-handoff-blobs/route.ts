import { NextRequest, NextResponse } from "next/server";
import { purgeExpiredTeamHandoffBlobs } from "@/lib/team-handoff-blobs";

export const runtime = "nodejs";

/**
 * Deletes team handoff creatives from Vercel Blob after ~7 days.
 * Call daily (same secret pattern as chat-attachments cron).
 */
export async function GET(req: NextRequest) {
  const secret =
    req.headers.get("x-cron-secret")?.trim() ||
    req.nextUrl.searchParams.get("secret")?.trim() ||
    "";
  const expected =
    process.env.DAILY_OFFERS_CRON_SECRET?.trim() ||
    process.env.CHAT_ATTACHMENTS_CRON_SECRET?.trim() ||
    process.env.TEAM_HANDOFF_CRON_SECRET?.trim() ||
    "";
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await purgeExpiredTeamHandoffBlobs();
  return NextResponse.json({ ok: true, ...result });
}
