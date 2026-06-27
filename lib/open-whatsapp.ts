export type OpenWhatsAppResult = "navigate" | "popup" | "popup-blocked";

/** Open a WhatsApp share/chat URL reliably on mobile and desktop. */
export function openWhatsAppShareUrl(url: string): OpenWhatsAppResult | false {
  if (typeof window === "undefined" || !url.trim()) return false;

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  try {
    if (isMobile) {
      window.location.assign(url);
      return "navigate";
    }

    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (opened) return "popup";
    return "popup-blocked";
  } catch {
    return "popup-blocked";
  }
}
