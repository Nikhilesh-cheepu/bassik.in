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

export function parseTaskOutletId(raw: unknown): string | null {
  const id = typeof raw === "string" ? raw.trim() : "";
  if (!id) return null;
  return isTeamOutletId(id) ? id : null;
}

export function isTeamOutletId(id: string): id is TeamOutletId {
  return TEAM_AD_OUTLETS.some((o) => o.id === id);
}
