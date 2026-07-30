/** Outlets on the SEO & ads task board (marketing scope). */
export const TEAM_AD_OUTLETS = [
  { id: "c53", label: "C53" },
  { id: "boiler-room", label: "Boiler Room" },
  { id: "firefly", label: "Firefly" },
  { id: "komma", label: "Komma" },
  { id: "kiik69", label: "KIIK 69" },
  { id: "asilmandi", label: "Asil Mandi" },
  { id: "antervedi", label: "Antervedi" },
  { id: "clubrogue-jubilee-hills", label: "Jubilee Hills Clubrogue" },
  { id: "clubrogue-kondapur", label: "Kondapur Clubrogue" },
  { id: "clubrogue-gachibowli", label: "Gachibowli Clubrogue" },
  { id: "clubrogue-general", label: "Club Rogue General" },
  { id: "bassik", label: "Bassik" },
] as const;

export type TeamOutletId = (typeof TEAM_AD_OUTLETS)[number]["id"];

export function teamOutletLabel(outletId: string | null | undefined): string {
  if (!outletId?.trim()) return "General";
  return TEAM_AD_OUTLETS.find((o) => o.id === outletId)?.label ?? outletId;
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
