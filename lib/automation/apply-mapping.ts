import type { ColumnMapping } from "./types";
import { normalizePhone } from "./phone";

export type MappedContactRow = {
  fullName: string | null;
  phone: string;
  venue: string | null;
  extra: Record<string, string> | null;
};

function slugExtraKey(header: string): string {
  return header
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 64) || "field";
}

export function applyColumnMapping(
  row: Record<string, string>,
  mappings: ColumnMapping[]
): MappedContactRow | null {
  let fullName: string | null = null;
  let phoneRaw = "";
  let venue: string | null = null;
  const extra: Record<string, string> = {};

  for (const m of mappings) {
    const val = (row[m.sourceColumn] ?? "").trim();
    if (!val && m.target !== "ignore") continue;

    switch (m.target) {
      case "fullName":
        fullName = fullName ? `${fullName} ${val}`.trim() : val;
        break;
      case "phone":
        phoneRaw = phoneRaw ? `${phoneRaw},${val}` : val;
        break;
      case "venue":
        venue = venue ? `${venue} / ${val}` : val;
        break;
      case "extra": {
        const key = (m.extraKey && m.extraKey.trim()) || slugExtraKey(m.sourceColumn);
        extra[key] = val;
        break;
      }
      default:
        break;
    }
  }

  const phone = normalizePhone(phoneRaw.split(/[,;/]/)[0]?.trim() ?? phoneRaw);
  if (!phone) return null;

  return {
    fullName,
    phone,
    venue,
    extra: Object.keys(extra).length ? extra : null,
  };
}

export function mapAllRows(
  rows: Record<string, string>[],
  mappings: ColumnMapping[]
): { contacts: MappedContactRow[]; skipped: number } {
  const contacts: MappedContactRow[] = [];
  let skipped = 0;
  for (const row of rows) {
    const m = applyColumnMapping(row, mappings);
    if (!m) skipped += 1;
    else contacts.push(m);
  }
  return { contacts, skipped };
}
