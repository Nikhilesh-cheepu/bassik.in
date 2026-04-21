/** `YYYY-MM-DD` for the user's local calendar (avoid `toISOString()` which is UTC). */
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local civil date + `HH:mm` → epoch ms (same interpretation as manual booking in IST). */
export function localYmdTimeMs(dateYmd: string, hhmm: string): number {
  const [yp, mp, dp] = dateYmd.split("-").map(Number);
  const [hp, mip] = hhmm.split(":").map(Number);
  if (!yp || !mp || !dp || hp == null || mip == null || Number.isNaN(yp)) return NaN;
  return new Date(yp, mp - 1, dp, hp, mip, 0, 0).getTime();
}

/** `base` + `days` at local noon (stable across DST when stepping days). */
export function addLocalDays(base: Date, days: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + days, 12, 0, 0, 0);
}
