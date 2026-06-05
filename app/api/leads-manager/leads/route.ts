import { NextRequest, NextResponse } from "next/server";
import { getLeadsManagerFromRequest } from "@/lib/leads-manager-auth";
import { listLeadsForManager } from "@/lib/venue-chat-data";

export async function GET(req: NextRequest) {
  if (!(await getLeadsManagerFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const brandId = req.nextUrl.searchParams.get("brandId");
  const leads = await listLeadsForManager(brandId);
  return NextResponse.json({ leads });
}
