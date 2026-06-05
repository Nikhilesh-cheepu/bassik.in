import { NextRequest, NextResponse } from "next/server";
import { purgeExpiredChatAttachments } from "@/lib/chat-attachments";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const secret =
    req.headers.get("x-cron-secret")?.trim() ||
    req.nextUrl.searchParams.get("secret")?.trim() ||
    "";
  const expected =
    process.env.DAILY_OFFERS_CRON_SECRET?.trim() ||
    process.env.CHAT_ATTACHMENTS_CRON_SECRET?.trim() ||
    "";
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await purgeExpiredChatAttachments();
  return NextResponse.json({ ok: true, ...result });
}
