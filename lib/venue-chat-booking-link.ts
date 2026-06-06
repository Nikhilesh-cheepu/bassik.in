/** Client-safe booking-link metadata helpers. */

export type BookingLinkKind = "event" | "table" | "external";

export type ParsedBookingLink = {
  kind: BookingLinkKind;
  url: string;
  label: string;
  eventId?: string;
};

export function buildBookingLinkMetadata(
  url: string,
  label: string,
  kind: "event" | "table",
  eventId?: string | null
): Record<string, unknown> {
  if (kind === "event" && eventId) {
    return { type: "booking_link", url, label, bookingKind: "event", eventId };
  }
  return { type: "booking_link", url, label, bookingKind: "table" };
}

export function parseBookingLinkMetadata(
  metadata: Record<string, unknown> | null | undefined
): ParsedBookingLink | null {
  if (!metadata || metadata.type !== "booking_link" || typeof metadata.url !== "string") {
    return null;
  }
  const label = typeof metadata.label === "string" ? metadata.label : "Open link →";
  const url = metadata.url;

  if (metadata.bookingKind === "event") {
    const eventId =
      typeof metadata.eventId === "string"
        ? metadata.eventId
        : extractEventIdFromUrl(url) ?? undefined;
    return { kind: "event", url, label, eventId };
  }
  if (metadata.bookingKind === "table") {
    const eventId = extractEventIdFromUrl(url);
    if (eventId) return { kind: "event", url, label, eventId };
    return { kind: "table", url, label };
  }

  const eventId = extractEventIdFromUrl(url);
  if (url.includes("/book")) {
    if (eventId) return { kind: "event", url, label, eventId };
    return { kind: "table", url, label };
  }
  if (eventId) return { kind: "event", url, label, eventId };
  return { kind: "external", url, label };
}

/** Normalize legacy `/{brand}?eventId=` links to the book page. */
export function normalizeBookingLinkUrl(brandId: string, url: string): string {
  if (!url.startsWith("/")) return url;
  try {
    const u = new URL(url, "https://bassik.in");
    const base = `/${brandId}`;
    if ((u.pathname === base || u.pathname === `${base}/`) && u.search) {
      return `${base}/book${u.search}`;
    }
    if (u.pathname === `${base}/book` || u.pathname === `${base}/book/`) {
      return `${base}/book${u.search}`;
    }
  } catch {
    /* keep url */
  }
  return url;
}

function extractEventIdFromUrl(url: string): string | null {
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "https://bassik.in";
    const u = new URL(url, base);
    const id = u.searchParams.get("eventId");
    return id?.trim() || null;
  } catch {
    const m = url.match(/[?&]eventId=([^&]+)/);
    return m?.[1] ? decodeURIComponent(m[1]) : null;
  }
}
