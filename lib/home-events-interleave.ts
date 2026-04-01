/** Sort key for venue offers / home feed items with optional eventDate. */
export function compareByEventDate(
  a: { eventDate: string | null },
  b: { eventDate: string | null }
): number {
  const ta = a.eventDate ? Date.parse(a.eventDate) : NaN;
  const tb = b.eventDate ? Date.parse(b.eventDate) : NaN;
  const aOk = !Number.isNaN(ta);
  const bOk = !Number.isNaN(tb);
  if (aOk && bOk && ta !== tb) return ta - tb;
  if (aOk && !bOk) return -1;
  if (!aOk && bOk) return 1;
  return 0;
}

/**
 * Round-robin across brands so consecutive cards are usually different venues.
 * Shuffles brand rotation order each call. Single-brand feeds stay in date order.
 */
export function interleaveEventsByBrand<T extends { brandId: string; eventDate: string | null }>(
  items: T[]
): T[] {
  const brandIds = [...new Set(items.map((i) => i.brandId))];
  if (brandIds.length <= 1) {
    return [...items].sort(compareByEventDate);
  }

  const byBrand = new Map<string, T[]>();
  for (const id of brandIds) {
    byBrand.set(id, []);
  }
  for (const item of items) {
    byBrand.get(item.brandId)!.push(item);
  }
  for (const q of byBrand.values()) {
    q.sort((a, b) => compareByEventDate(a, b));
  }

  const order = [...brandIds];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const result: T[] = [];
  for (;;) {
    let added = false;
    for (const bid of order) {
      const q = byBrand.get(bid)!;
      if (q.length > 0) {
        result.push(q.shift()!);
        added = true;
      }
    }
    if (!added) break;
  }
  return result;
}
