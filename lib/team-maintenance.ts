/** Pause designer auto-seed + TV calendar backfill while ops resets the queue. */
export function isTeamDesignerQueueFrozen(): boolean {
  const v = process.env.TEAM_DESIGNER_QUEUE_FROZEN?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
