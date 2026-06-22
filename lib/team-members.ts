/** Team member roster for /team — extend via TEAM_MEMBERS_JSON in env. */

export type TeamMember = {
  id: string;
  name: string;
  /** e.g. SEO, Designer — shown in forms, not on admin tabs */
  role?: string;
};

const DEFAULT_ROSTER: TeamMember[] = [
  { id: "amit", name: "Amit", role: "SEO" },
  { id: "jeslyn", name: "Jeslyn", role: "Designer 1" },
  { id: "mahesh", name: "Mahesh", role: "Designer 2" },
];

function normalizeMember(raw: unknown): TeamMember | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as TeamMember;
  if (typeof m.id !== "string" || typeof m.name !== "string") return null;
  const id = m.id.trim();
  const name = m.name.trim();
  if (!id || !name) return null;
  const role = typeof m.role === "string" && m.role.trim() ? m.role.trim() : undefined;
  return { id, name, ...(role ? { role } : {}) };
}

export function getTeamMemberRoster(): TeamMember[] {
  const raw = process.env.TEAM_MEMBERS_JSON?.trim();
  if (!raw) return DEFAULT_ROSTER;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_ROSTER;
    const list = parsed
      .map(normalizeMember)
      .filter((m): m is TeamMember => m !== null);
    return list.length > 0 ? list : DEFAULT_ROSTER;
  } catch {
    return DEFAULT_ROSTER;
  }
}

const DEFAULT_PASSWORDS: Record<string, string> = {
  amit: "amit01",
  jeslyn: "jeslyn01",
  mahesh: "mahesh01",
};

/** Passwords per member id — TEAM_MEMBER_PASSWORDS='{"amit":"amit01","jeslyn":"jeslyn01"}' */
export function getTeamMemberPasswords(): Record<string, string> {
  const raw = process.env.TEAM_MEMBER_PASSWORDS?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* fallback */
    }
  }
  const legacy = process.env.TEAM_MEMBER_PASSWORD?.trim();
  if (legacy) return { amit: legacy, jeslyn: "jeslyn01", mahesh: "mahesh01" };
  return DEFAULT_PASSWORDS;
}

export function isTeamMemberId(id: string): boolean {
  return getTeamMemberRoster().some((m) => m.id === id);
}

export function teamMemberName(id: string | null | undefined): string {
  if (!id) return "—";
  return getTeamMemberRoster().find((m) => m.id === id)?.name ?? id;
}

export function teamMembersForClient(): TeamMember[] {
  return getTeamMemberRoster();
}

export function defaultTeamMemberId(): string {
  return getTeamMemberRoster()[0]?.id ?? "amit";
}
