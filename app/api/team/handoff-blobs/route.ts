import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import {
  deleteTeamHandoffBlobs,
  listTeamHandoffBlobs,
  purgeExpiredTeamHandoffBlobs,
  TEAM_HANDOFF_BLOB_TTL_DAYS,
} from "@/lib/team-handoff-blobs";

export const runtime = "nodejs";

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
      const result = await purgeExpiredTeamHandoffBlobs();
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "delete" && Array.isArray(body.urls)) {
      const result = await deleteTeamHandoffBlobs(
        body.urls.filter((u): u is string => typeof u === "string")
      );
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[team/handoff-blobs] POST", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
