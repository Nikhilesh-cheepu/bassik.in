/** Client-safe copy helpers for venue chat (no DB imports). */

export type ClientChatActionType =
  | "book_table"
  | "ask_menu"
  | "pricing_offers"
  | "explore_website";

export function buildGuestGreeting(venueName: string, hostName: string | null | undefined): string {
  const venue = venueName.trim() || "our venue";
  if (hostName?.trim()) {
    return `Dear Guest,\n\nWelcome to ${venue}.\n\nI'm ${hostName.trim()}, your host here — happy to help you plan the perfect night out.\n\nHow may I assist you today?`;
  }
  return `Dear Guest,\n\nWelcome to ${venue}.\n\nI'm your friendly neighbourhood host — happy to help you plan the perfect night out.\n\nHow may I assist you today?`;
}

export function clientActionUserMessage(type: ClientChatActionType): string {
  switch (type) {
    case "book_table":
      return "I'd like to book a table";
    case "ask_menu":
      return "Can you show me the menu?";
    case "pricing_offers":
      return "What are your pricing and offers?";
    case "explore_website":
      return "I'd like to explore your website";
  }
}

/** Warm ask for name + mobile — use line breaks exactly as shown. */
export function formatNameAndPhoneAsk(intro: string, outro?: string): string {
  const tail = outro?.trim() ? `\n\n${outro.trim()}` : "";
  return `${intro.trim()}\n\nName:-\n\nContact num:-${tail}`;
}

/** After phone is known — ask name only. */
export function formatNameAsk(intro: string, outro?: string): string {
  const tail = outro?.trim() ? `\n\n${outro.trim()}` : "";
  return `${intro.trim()}\n\nName:-${tail}`;
}

/** After name is known — ask mobile only. */
export function formatPhoneAsk(intro: string, outro?: string): string {
  const tail = outro?.trim() ? `\n\n${outro.trim()}` : "";
  return `${intro.trim()}\n\nContact num:-${tail}`;
}
