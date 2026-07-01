import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { enhanceTeamNote } from "@/lib/team-note-ai";
import { isTeamOutletId } from "@/lib/team-outlets";

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const noteBody = typeof body.body === "string" ? body.body.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const outletRaw = typeof body.outletId === "string" ? body.outletId.trim() : "";
  const outletId = outletRaw && isTeamOutletId(outletRaw) ? outletRaw : null;
  const mode = body.mode === "organize" ? "organize" : "summarize";

  if (!noteBody) {
    return NextResponse.json({ error: "Note body is required." }, { status: 400 });
  }

  try {
    const result = await enhanceTeamNote({ title, body: noteBody, outletId, mode });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI request failed";
    const status = msg.includes("not configured") ? 503 : 400;
    console.error("[team notes ai]", e);
    return NextResponse.json({ error: msg }, { status });
  }
}
