import { NextRequest, NextResponse } from "next/server";
import { BRANDS } from "@/lib/brands";
import { getLeadsManagerFromRequest } from "@/lib/leads-manager-auth";
import { pruneAndRelabelChatLeads } from "@/lib/venue-chat-leads-cleanup";

export async function POST(req: NextRequest) {
  if (!(await getLeadsManagerFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { brandId?: string | null; confirm?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.confirm !== "PRUNE") {
    return NextResponse.json({ error: 'Type confirm: "PRUNE" to proceed' }, { status: 400 });
  }

  const brandId = body.brandId?.trim() || null;
  if (brandId && !BRANDS.some((b) => b.id === brandId)) {
    return NextResponse.json({ error: "Invalid brandId" }, { status: 400 });
  }

  try {
    const result = await pruneAndRelabelChatLeads(brandId);
    return NextResponse.json({ ok: true, brandId: brandId ?? "all", ...result });
  } catch (e) {
    console.error("[leads-manager prune]", e);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
