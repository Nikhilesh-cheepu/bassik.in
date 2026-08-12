/** Outlets on the SEO & ads task board (marketing scope). */
export const TEAM_AD_OUTLETS = [
  { id: "c53", label: "C53" },
  { id: "boiler-room", label: "Boiler Room" },
  { id: "firefly", label: "Firefly" },
  { id: "komma", label: "Komma" },
  { id: "kiik69", label: "KIIK 69" },
  { id: "asilmandi", label: "Asilmandi" },
  { id: "antervedi", label: "Antervedi" },
  /** Shared weekend TV calendar (C53 + Boiler Room + Firefly). */
  { id: "c53-boiler-firefly", label: "C53 · Boiler Room · Firefly" },
  { id: "clubrogue-jubilee-hills", label: "Jubilee Hills Clubrogue" },
  { id: "clubrogue-kondapur", label: "Kondapur Clubrogue" },
  { id: "clubrogue-gachibowli", label: "Gachibowli Clubrogue" },
  { id: "clubrogue-general", label: "Club Rogue General" },
  { id: "bassik", label: "Bassik" },
] as const;

export type TeamOutletId = (typeof TEAM_AD_OUTLETS)[number]["id"];

/** Slug for a typed custom footlight / outlet name. */
export function slugifyOutletId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/**
 * Accept known outlet ids, or a typed custom name (stored as a slug; label falls back to input).
 * Returns null if empty / invalid.
 */
export function normalizeDesignerOutletId(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (isTeamOutletId(t)) return t;
  const slug = slugifyOutletId(t);
  return slug || null;
}

/** Multi-outlet designer tasks store ids joined with `+` (hyphens stay inside a single slug). */
export const DESIGNER_OUTLET_JOIN = "+";

export function splitDesignerOutletIds(outletId: string | null | undefined): string[] {
  const raw = outletId?.trim() ?? "";
  if (!raw) return [];
  return [...new Set(raw.split(DESIGNER_OUTLET_JOIN).map((id) => id.trim()).filter(Boolean))];
}

export function joinDesignerOutletIds(ids: string[]): string {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))].join(DESIGNER_OUTLET_JOIN);
}

function labelOneOutlet(outletId: string): string {
  const known = TEAM_AD_OUTLETS.find((o) => o.id === outletId)?.label;
  if (known) return known;
  return outletId
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function teamOutletLabel(outletId: string | null | undefined): string {
  if (!outletId?.trim()) return "General";
  const parts = splitDesignerOutletIds(outletId);
  if (parts.length > 1) return parts.map(labelOneOutlet).join(" · ");
  return labelOneOutlet(parts[0] ?? outletId);
}

/**
 * Chip label for Daily Checklist: "C53 Story" / "Boiler Room Post" / "Firefly Ad".
 * Accepts outlet id or a title like "C53 Stories".
 */
export function outletKindTitle(
  outletIdOrTitle: string | null | undefined,
  kind: "stories" | "posts" | "ads" | string | null | undefined
): string {
  const raw = (outletIdOrTitle || "").trim();
  if (!raw) return "";
  const asId = TEAM_AD_OUTLETS.find((o) => o.id === raw);
  const base = (asId ? asId.label : raw)
    .replace(/\s+(Stories|Posts|Ads|Story|Post|Ad)$/i, "")
    .trim();
  const name = base || raw;
  if (kind === "stories") return `${name} Story`;
  if (kind === "posts") return `${name} Post`;
  if (kind === "ads") return `${name} Ad`;
  return name;
}

export function parseTaskOutletId(raw: unknown): string | null {
  const id = typeof raw === "string" ? raw.trim() : "";
  if (!id) return null;
  return isTeamOutletId(id) ? id : null;
}

export function isTeamOutletId(id: string): id is TeamOutletId {
  return TEAM_AD_OUTLETS.some((o) => o.id === id);
}
