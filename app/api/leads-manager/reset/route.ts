import { NextRequest, NextResponse } from "next/server";
import { BRANDS } from "@/lib/brands";
import { getLeadsManagerFromRequest } from "@/lib/leads-manager-auth";
import { resetVenueChatData } from "@/lib/venue-chat-config";

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

  if (body.confirm !== "RESET") {
    return NextResponse.json({ error: 'Type confirm: "RESET" to proceed' }, { status: 400 });
  }

  const brandId = body.brandId?.trim() || null;
  if (brandId && !BRANDS.some((b) => b.id === brandId)) {
    return NextResponse.json({ error: "Invalid brandId" }, { status: 400 });
  }

  try {
    const result = await resetVenueChatData(brandId ?? undefined);
    return NextResponse.json({
      ok: true,
      brandId: brandId ?? "all",
      deletedLeads: result.deletedLeads,
    });
  } catch (e) {
    console.error("[leads-manager reset]", e);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
