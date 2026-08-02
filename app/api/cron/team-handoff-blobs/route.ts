import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  listTeamHandoffBlobs,
  purgeExpiredTeamHandoffBlobs,
} from "@/lib/team-handoff-blobs";

export const runtime = "nodejs";

/**
 * Deletes expired handoff blobs. Clears fileUrl on jobs — never deletes Done rows.
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

  const expired = await listTeamHandoffBlobs({ expiredOnly: true });
  const urls = expired.map((b) => b.url);
  const result = await purgeExpiredTeamHandoffBlobs();
  let jobsCleared = 0;
  if (urls.length > 0) {
    const cleared = await prisma.teamDesignerJob.updateMany({
      where: { fileUrl: { in: urls } },
      data: { fileUrl: null, waApproved: false },
    });
    jobsCleared = cleared.count;
  }
  return NextResponse.json({ ok: true, ...result, jobsCleared });
}
