/** Persist chat session in iframe embeds where third-party cookies are blocked. */

export function chatSessionStorageKey(brandId: string): string {
  return `bassik_chat_session_${brandId}`;
}

export function readStoredChatSessionToken(brandId: string): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage.getItem(chatSessionStorageKey(brandId));
  } catch {
    return null;
  }
}

export function writeStoredChatSessionToken(brandId: string, token: string): void {
  if (typeof sessionStorage === "undefined" || !token.trim()) return;
  try {
    sessionStorage.setItem(chatSessionStorageKey(brandId), token.trim());
  } catch {
    /* private mode / quota */
  }
}

export function chatSessionRequestHeaders(brandId: string): HeadersInit {
  const token = readStoredChatSessionToken(brandId);
  if (!token) return {};
  return { "X-Venue-Chat-Session": token };
}
