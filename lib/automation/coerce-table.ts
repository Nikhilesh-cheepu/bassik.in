import type { ParsedSheet } from "./parse-xlsx";

export type CoercedSheet = ParsedSheet & { truncated?: boolean };

export function coerceParsedSheet(raw: unknown): CoercedSheet {
  if (!raw || typeof raw !== "object") {
    throw new Error("AI returned invalid table data.");
  }
  const o = raw as Record<string, unknown>;
  const truncated = Boolean(o.truncated);
  let headersRaw = o.headers ?? o.columns;
  if (!Array.isArray(headersRaw)) {
    throw new Error("AI response missing headers array.");
  }
  const headers = headersRaw.map((h, i) => {
    const s = String(h ?? "").trim();
    return s || `Column_${i + 1}`;
  });

  const rowsRaw = o.rows;
  if (!Array.isArray(rowsRaw)) {
    return { headers, rows: [] };
  }

  const rows: Record<string, string>[] = [];
  for (const r of rowsRaw) {
    if (!r || typeof r !== "object") continue;
    const rec = r as Record<string, unknown>;
    const obj: Record<string, string> = {};
    let any = false;
    for (const h of headers) {
      const direct = rec[h];
      const lower = Object.keys(rec).find((k) => k.toLowerCase() === h.toLowerCase());
      const v = direct !== undefined ? direct : lower ? rec[lower] : undefined;
      const s = v === null || v === undefined ? "" : String(v).trim();
      obj[h] = s;
      if (s) any = true;
    }
    if (any) rows.push(obj);
  }

  return { headers, rows, ...(truncated ? { truncated: true } : {}) };
}
