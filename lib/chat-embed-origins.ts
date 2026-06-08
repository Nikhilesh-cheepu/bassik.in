/** Allowed parent origins that may iframe venue chat embed pages. */

const DEFAULT_DEV_ORIGINS = ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"];

const DEFAULT_PROD_ORIGINS = [
  "https://fireflyteluguclub.com",
  "https://www.fireflyteluguclub.com",
];

export function parseChatEmbedAllowedOrigins(raw = process.env.CHAT_EMBED_ALLOWED_ORIGINS): string[] {
  const fromEnv = (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const defaults = process.env.NODE_ENV === "production" ? DEFAULT_PROD_ORIGINS : DEFAULT_DEV_ORIGINS;
  return [...new Set([...defaults, ...fromEnv])];
}

/** CSP `frame-ancestors` value for /:outlet/chat/embed routes. */
export function chatEmbedFrameAncestorsDirective(): string {
  const origins = parseChatEmbedAllowedOrigins();
  if (!origins.length) return "'self'";
  return `'self' ${origins.join(" ")}`;
}

export const BASSIK_CHAT_EMBED_CLOSE = "bassik-chat-close";
