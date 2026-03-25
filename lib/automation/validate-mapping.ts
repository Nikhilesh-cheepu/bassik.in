import type { ColumnMapping } from "./types";

function slugExtraKey(header: string): string {
  return header
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 64) || "field";
}

/** Normalizes extra keys and returns an error string or null if OK. */
export function sanitizeMappings(mappings: ColumnMapping[], headers: string[]): ColumnMapping[] | string {
  const set = new Set(headers);
  const out: ColumnMapping[] = [];
  for (const m of mappings) {
    const col = String(m.sourceColumn ?? "").trim();
    if (!set.has(col)) continue;
    const target = m.target;
    if (target === "extra") {
      const extraKey = (m.extraKey && m.extraKey.trim()) || slugExtraKey(col);
      out.push({ sourceColumn: col, target: "extra", extraKey });
    } else {
      out.push({ sourceColumn: col, target });
    }
  }
  for (const h of headers) {
    if (!out.some((x) => x.sourceColumn === h)) {
      out.push({ sourceColumn: h, target: "ignore" });
    }
  }
  if (!out.some((x) => x.target === "phone")) {
    return "Map at least one column to Phone (required for WhatsApp).";
  }
  return out;
}
