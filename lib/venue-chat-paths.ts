/** Client-safe URL helpers for venue chat (no DB imports). */

export function bookingPath(brandId: string, eventId?: string | null): string {
  if (eventId) return `/${brandId}?eventId=${encodeURIComponent(eventId)}`;
  return `/${brandId}/book`;
}
