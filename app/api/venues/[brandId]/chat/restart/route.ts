import { NextRequest, NextResponse } from "next/server";
import { BRANDS } from "@/lib/brands";
import { chatCookieName } from "@/lib/venue-chat-data";
import { restartGuestChatSession } from "@/lib/venue-chat-session";
import { resolveChatSessionToken } from "@/lib/venue-chat-session-request";

export const runtime = "nodejs";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function parseUtm(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return {
    utmSource: sp.get("utm_source"),
    utmMedium: sp.get("utm_medium"),
    utmCampaign: sp.get("utm_campaign"),
    utmContent: sp.get("utm_content"),
  };
}

function setSessionCookie(res: NextResponse, brandId: string, token: string) {
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(chatCookieName(brandId), token, {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

/** Guest: delete current chat from DB and start a fresh session. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params;
  if (!BRANDS.some((b) => b.id === brandId)) {
    return NextResponse.json({ error: "Unknown venue" }, { status: 404 });
  }

  try {
    const sessionToken = resolveChatSessionToken(req, brandId);
    const session = await restartGuestChatSession(brandId, sessionToken, parseUtm(req));
    const res = NextResponse.json({
      ok: true,
      lead: session.lead,
      messages: session.messages,
      venue: session.venue,
      chat: session.chat,
    });
    setSessionCookie(res, brandId, session.sessionToken);
    return res;
  } catch (e) {
    console.error("[venue-chat restart]", e);
    return NextResponse.json({ error: "Could not start a new chat" }, { status: 503 });
  }
}
