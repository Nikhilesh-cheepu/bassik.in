function rejectBadGuestName(name: string | undefined): string | undefined {
  if (!name?.trim()) return undefined;
  const n = name.trim().replace(/[.,;:!?]+$/g, "").trim();
  if (n.length < 2 || n.length > 48) return undefined;
  if (/^(i'?m|interested|book|table|hi|hello|yes|ok|sure|thanks)$/i.test(n)) return undefined;
  if (/interested in/i.test(n)) return undefined;
  if (/\bDJ\b/i.test(n) && n.split(/\s+/).length > 2) return undefined;
  if (/^\d/.test(n)) return undefined;
  if (/^(mon|tue|wed|thu|fri|sat|sun)/i.test(n)) return undefined;
  return n;
}

/** Valid guest name only — strips AI/event-title corruption from lead state. */
export function sanitizeGuestName(name: string | null | undefined): string | null {
  const ok = rejectBadGuestName(name ?? undefined);
  return ok ?? null;
}

export function rejectExtractedGuestName(name: string | undefined): string | undefined {
  return rejectBadGuestName(name);
}

/** Short, human label for chat copy (not the full poster line). */
export function friendlyEventLabel(name: string | null | undefined): string {
  if (!name?.trim()) return "this night";
  const s = name.split(" · ")[0]?.trim() || name.trim();
  const afterDash = s.match(/[-–—]\s*(DJ\s.+)$/i);
  if (afterDash?.[1]) return afterDash[1].trim();
  const dj = s.match(/(DJ\s[\w.]+(?:\s+[\w.]+)?)/i);
  if (dj?.[1]) return dj[1];
  if (s.length > 32) return `${s.slice(0, 29)}…`;
  return s;
}
