import { NextRequest, NextResponse } from "next/server";
import { sendDailyOffers } from "@/lib/automation/daily-offers";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const secret = process.env.DAILY_OFFERS_CRON_SECRET?.trim();
  const providedHeader = request.headers.get("x-cron-secret")?.trim();
  const url = new URL(request.url);
  const providedQuery = url.searchParams.get("secret")?.trim();
  const provided = providedHeader || providedQuery;
  if (!secret || !provided || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized cron." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const maxRecipients =
      body && typeof body.maxRecipients === "number" ? Math.floor(body.maxRecipients) : undefined;
    const res = await sendDailyOffers({ maxRecipients });
    return NextResponse.json(res);
  } catch (e) {
    console.error("[daily-offers]", e);
    return NextResponse.json({ error: "Daily offers failed." }, { status: 500 });
  }
}

