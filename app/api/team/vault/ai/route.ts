import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { suggestVaultTitle } from "@/lib/team-vault-ai";
import { isTeamOutletId } from "@/lib/team-outlets";

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const outletRaw = typeof body.outletId === "string" ? body.outletId.trim() : "";
  const outletId = outletRaw && isTeamOutletId(outletRaw) ? outletRaw : null;

  if (body.password !== undefined) {
    return NextResponse.json({ error: "Do not send passwords to AI." }, { status: 400 });
  }

  try {
    const result = await suggestVaultTitle({ url: url || null, username: username || null, notes: notes || null, outletId });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI request failed";
    const status = msg.includes("not configured") ? 503 : 400;
    console.error("[team vault ai]", e);
    return NextResponse.json({ error: msg }, { status });
  }
}
