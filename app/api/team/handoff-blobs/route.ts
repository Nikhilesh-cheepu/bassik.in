import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTeamFromRequest } from "@/lib/team-auth";
import {
  deleteTeamHandoffBlobs,
  listTeamHandoffBlobs,
  purgeExpiredTeamHandoffBlobs,
  TEAM_HANDOFF_BLOB_TTL_DAYS,
} from "@/lib/team-handoff-blobs";

export const runtime = "nodejs";

/** Clear job fileUrl after blob delete — never delete Done rows. */
async function clearJobFileUrls(urls: string[]): Promise<number> {
  const clean = urls.filter((u) => typeof u === "string" && u.includes("/team/handoff/"));
  if (clean.length === 0) return 0;
  const result = await prisma.teamDesignerJob.updateMany({
    where: { fileUrl: { in: clean } },
    data: { fileUrl: null, waApproved: false },
  });
  return result.count;
}

/** Admin: list expired (or all) handoff uploads for manual cleanup. */
export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const all = req.nextUrl.searchParams.get("all") === "1";
  try {
    const blobs = await listTeamHandoffBlobs({ expiredOnly: !all });
    return NextResponse.json({
      ttlDays: TEAM_HANDOFF_BLOB_TTL_DAYS,
      blobs,
      count: blobs.length,
    });
  } catch (err) {
    console.error("[team/handoff-blobs] GET", err);
    return NextResponse.json({ error: "Failed to list blobs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as {
      action?: string;
      urls?: string[];
    };

    if (body.action === "purge-expired") {
      const expired = await listTeamHandoffBlobs({ expiredOnly: true });
      const urls = expired.map((b) => b.url);
      const result = await purgeExpiredTeamHandoffBlobs();
      const jobsCleared = await clearJobFileUrls(urls);
      return NextResponse.json({ ok: true, ...result, jobsCleared });
    }

    if (body.action === "delete" && Array.isArray(body.urls)) {
      const urls = body.urls.filter((u): u is string => typeof u === "string");
      const result = await deleteTeamHandoffBlobs(urls);
      const jobsCleared = await clearJobFileUrls(urls);
      return NextResponse.json({ ok: true, ...result, jobsCleared });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[team/handoff-blobs] POST", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
