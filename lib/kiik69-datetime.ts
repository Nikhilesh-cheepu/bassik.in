const IST = "Asia/Kolkata";

function shortDateFromYmd(ymd: string): string {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: IST });
  return new Date(ymd + "T12:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: ymd.slice(0, 4) !== today.slice(0, 4) ? "numeric" : undefined,
  });
}

/** Small reference stamp — e.g. "3 Jul · 10:28 pm" (IST). */
export function formatKiik69Timestamp(iso: string, businessYmd?: string | null): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-IN", {
    timeZone: IST,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const createdYmd = d.toLocaleDateString("en-CA", { timeZone: IST });
  const ymd =
    businessYmd && /^\d{4}-\d{2}-\d{2}$/.test(businessYmd) ? businessYmd : createdYmd;
  return `${shortDateFromYmd(ymd)} · ${time}`;
}
