import type { NextRequest } from "next/server";
import { chatCookieName } from "@/lib/venue-chat-data";

export const CHAT_SESSION_HEADER = "x-venue-chat-session";

/** Cookie first; header fallback for third-party iframe embeds. */
export function resolveChatSessionToken(req: NextRequest, brandId: string): string | null {
  const cookie = req.cookies.get(chatCookieName(brandId))?.value?.trim();
  if (cookie) return cookie;
  const header = req.headers.get(CHAT_SESSION_HEADER)?.trim();
  return header || null;
}
