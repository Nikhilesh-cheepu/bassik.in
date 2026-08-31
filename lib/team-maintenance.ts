/** Pause designer auto-seed + TV calendar backfill while ops resets the queue. */
export function isTeamDesignerQueueFrozen(): boolean {
  const v = process.env.TEAM_DESIGNER_QUEUE_FROZEN?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "no") return false;
  // Default frozen — set TEAM_DESIGNER_QUEUE_FROZEN=0 when re-seeding is OK again.
  return true;
}
