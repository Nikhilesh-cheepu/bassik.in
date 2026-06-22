/** Outlets on the SEO & ads task board (marketing scope). */
export const TEAM_AD_OUTLETS = [
  { id: "c53", label: "C53" },
  { id: "boiler-room", label: "Boiler Room" },
  { id: "firefly", label: "Firefly" },
  { id: "komma", label: "Komma" },
  { id: "kiik69", label: "KIIK 69" },
  { id: "asilmandi", label: "Asil Mandi" },
] as const;

export type TeamOutletId = (typeof TEAM_AD_OUTLETS)[number]["id"];

export function teamOutletLabel(outletId: string): string {
  return TEAM_AD_OUTLETS.find((o) => o.id === outletId)?.label ?? outletId;
}

export function isTeamOutletId(id: string): id is TeamOutletId {
  return TEAM_AD_OUTLETS.some((o) => o.id === id);
}
