/**
 * Soft-archive switch for public venue booking / outlet marketing.
 * When false (default), the homepage sells Bassik as an agency and outlet
 * routes stay in code + DB but are noindexed. Flip via env to restore.
 *
 * Set VENUE_BOOKING_LIVE=true (or NEXT_PUBLIC_VENUE_BOOKING_LIVE=true) to re-enable.
 */
export function isPublicVenueBookingLive(): boolean {
  const raw =
    process.env.VENUE_BOOKING_LIVE?.trim() ||
    process.env.NEXT_PUBLIC_VENUE_BOOKING_LIVE?.trim() ||
    "";
  return raw === "1" || raw.toLowerCase() === "true" || raw.toLowerCase() === "yes";
}
