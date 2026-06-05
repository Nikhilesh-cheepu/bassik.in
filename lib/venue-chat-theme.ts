/** Client-safe neon palette for guest chat (independent of venue accent yellow/orange). */

export type ChatNeonTheme = {
  cyan: string;
  violet: string;
  pink: string;
  mesh: string;
  headerGradient: string;
  titleGradient: string;
  sendGradient: string;
  userBubble: string;
  bookGradient: string;
  liveDot: string;
};

const NEON: ChatNeonTheme = {
  cyan: "#22d3ee",
  violet: "#a78bfa",
  pink: "#f472b6",
  mesh: "radial-gradient(ellipse 80% 50% at 20% -10%, rgba(34,211,238,0.12) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 90% 10%, rgba(167,139,250,0.1) 0%, transparent 50%), radial-gradient(ellipse 50% 30% at 50% 100%, rgba(244,114,182,0.06) 0%, transparent 45%)",
  headerGradient: "linear-gradient(180deg, rgba(8,8,12,0.92) 0%, rgba(4,4,8,0.88) 100%)",
  titleGradient: "linear-gradient(90deg, #67e8f9 0%, #c4b5fd 55%, #f9a8d4 100%)",
  sendGradient: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)",
  userBubble: "linear-gradient(135deg, rgba(6,182,212,0.95) 0%, rgba(139,92,246,0.92) 100%)",
  bookGradient: "linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)",
  liveDot: "#34d399",
};

export function getChatNeonTheme(_accentColor?: string): ChatNeonTheme {
  return NEON;
}

export function cleanEventsLabel(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  if (/events?\s*[—–-]\s*swipe|swipe.*tap to pick/i.test(text)) {
    return "Book any event here — tap one to reserve.";
  }
  return text.trim();
}
