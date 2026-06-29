import { addLocalDays, localYmdTimeMs, toLocalDateString } from "@/lib/local-date";

export const EVENT_BOOK_SLOTS = ["20:00", "21:00", "22:00", "23:00"] as const;
export type EventBookSlot = (typeof EVENT_BOOK_SLOTS)[number];

/** Calendar night (YYYY-MM-DD) from offer eventDate ISO, aligned with guest display. */
export function eventDateToYmd(iso: string | null | undefined): string | null {
  if (iso == null || typeof iso !== "string" || !iso.trim()) return null;
  const trimmed = iso.trim();
  const ymd = trimmed.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return trimmed.includes("T") ? parsed.toISOString().slice(0, 10) : toLocalDateString(parsed);
}

export function isEventSlotInPast(dateYmd: string, slot: string): boolean {
  if (!dateYmd || !slot) return false;
  const ms = localYmdTimeMs(dateYmd, slot);
  return !Number.isNaN(ms) && ms < Date.now();
}

export function getAvailableEventSlots(dateYmd: string): EventBookSlot[] {
  return EVENT_BOOK_SLOTS.filter((s) => !isEventSlotInPast(dateYmd, s));
}

export function firstAvailableEventSlot(dateYmd: string): EventBookSlot | null {
  return getAvailableEventSlots(dateYmd)[0] ?? null;
}

/** Never returns a past slot; uses event night when still bookable. */
export function resolveEventBookDateTime(eventDateIso: string | null | undefined): {
  date: string;
  time: EventBookSlot;
} {
  const today = toLocalDateString(new Date());
  const eventYmd = eventDateToYmd(eventDateIso);

  if (eventYmd) {
    const candidateDate = eventYmd < today ? today : eventYmd;
    const slot = firstAvailableEventSlot(candidateDate);
    if (slot) return { date: candidateDate, time: slot };
  }

  let date = today;
  let slot = firstAvailableEventSlot(date);
  if (!slot) {
    date = toLocalDateString(addLocalDays(new Date(), 1));
    slot = firstAvailableEventSlot(date) ?? "20:00";
  }
  return { date, time: slot };
}

export function eventSlotLabel(slot: EventBookSlot): string {
  if (slot === "20:00") return "8 PM";
  if (slot === "21:00") return "9 PM";
  if (slot === "22:00") return "10 PM";
  return "11 PM";
}
