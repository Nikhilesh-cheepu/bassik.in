/** Client-safe URL helpers for venue chat (no DB imports). */

export type BookingPathPrefill = {
  eventId?: string | null;
  name?: string | null;
  phone?: string | null;
  date?: string | null;
  time?: string | null;
  party?: number | null;
};

function appendQuery(base: string, params: URLSearchParams): string {
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

/** Table book page or outlet event deep-link with optional guest prefill. */
export function bookingPath(
  brandId: string,
  prefill?: BookingPathPrefill | string | null
): string {
  let opts: BookingPathPrefill = {};
  if (typeof prefill === "string") {
    opts = { eventId: prefill };
  } else if (prefill) {
    opts = prefill;
  }

  const params = new URLSearchParams();
  if (opts.eventId) params.set("eventId", opts.eventId);
  if (opts.name?.trim()) params.set("name", opts.name.trim().slice(0, 80));
  const phone = opts.phone?.replace(/\D/g, "").slice(-10);
  if (phone && phone.length === 10) params.set("phone", phone);
  if (opts.date && /^\d{4}-\d{2}-\d{2}$/.test(opts.date)) params.set("date", opts.date);
  if (opts.time && /^\d{2}:\d{2}$/.test(opts.time)) params.set("time", opts.time);
  if (opts.party && opts.party > 0) params.set("party", String(Math.min(30, opts.party)));

  if (opts.eventId) {
    return appendQuery(`/${brandId}`, params);
  }
  return appendQuery(`/${brandId}/book`, params);
}
