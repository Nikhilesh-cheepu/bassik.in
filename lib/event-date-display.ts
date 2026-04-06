/**
 * Guest-facing copy for offers: show the **event / show night** as a calendar date only.
 * Omitting clock time avoids confusion with listing expiry or “ends at” wording.
 */
export function formatGuestEventDateLabel(iso: string | null | undefined): string | null {
  if (iso == null || typeof iso !== "string" || !iso.trim()) return null;
  const trimmed = iso.trim();
  const ymd = trimmed.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    const [y, mo, d] = ymd.split("-").map(Number);
    const utc = new Date(Date.UTC(y, mo - 1, d));
    if (Number.isNaN(utc.getTime())) return null;
    return utc.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function guestEventDateLine(
  iso: string | null | undefined,
  options?: { eventContinuous?: boolean }
): string {
  if (options?.eventContinuous) return "Ongoing";
  return formatGuestEventDateLabel(iso) ?? "Date to be announced";
}
