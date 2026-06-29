/** Team member roster for /team — extend via TEAM_MEMBERS_JSON in env. */

export type TeamMemberKind = "default" | "poc";

export type TeamMember = {
  id: string;
  name: string;
  /** e.g. SEO, Designer — shown in forms, not on admin tabs */
  role?: string;
  /** poc = admin assistant (e.g. Shravya) — can assign tasks to delegateAssignees */
  kind?: TeamMemberKind;
  delegateAssignees?: string[];
};

const DEFAULT_ROSTER: TeamMember[] = [
  { id: "amit", name: "Amit", role: "SEO" },
  { id: "jeslyn", name: "Jeslyn", role: "Designer 1" },
  { id: "mahesh", name: "Mahesh", role: "Designer 2" },
  {
    id: "shravya",
    name: "Shravya",
    role: "POC",
    kind: "poc",
    delegateAssignees: ["mahesh"],
  },
];

function normalizeMember(raw: unknown): TeamMember | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as TeamMember;
  if (typeof m.id !== "string" || typeof m.name !== "string") return null;
  const id = m.id.trim();
  const name = m.name.trim();
  if (!id || !name) return null;
  const role = typeof m.role === "string" && m.role.trim() ? m.role.trim() : undefined;
  const kind = m.kind === "poc" ? ("poc" as const) : undefined;
  const delegateAssignees = Array.isArray(m.delegateAssignees)
    ? m.delegateAssignees
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        .map((id) => id.trim())
    : undefined;
  return {
    id,
    name,
    ...(role ? { role } : {}),
    ...(kind ? { kind } : {}),
    ...(delegateAssignees?.length ? { delegateAssignees } : {}),
  };
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
  shravya: "shravya2026",
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

export function getTeamMember(id: string): TeamMember | undefined {
  return getTeamMemberRoster().find((m) => m.id === id);
}

export function isTeamPocMember(id: string): boolean {
  return getTeamMember(id)?.kind === "poc";
}

/** Members a POC can assign ad tasks to (e.g. Mahesh for Shravya). */
export function pocDelegateAssigneeIds(pocId: string): string[] {
  const m = getTeamMember(pocId);
  if (!m || m.kind !== "poc") return [];
  return (m.delegateAssignees ?? []).filter((id) => isTeamMemberId(id));
}

export function canPocAssignTo(pocId: string, assigneeId: string): boolean {
  return pocDelegateAssigneeIds(pocId).includes(assigneeId);
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

/** Match member id or first name from free text (e.g. "assign to Mahesh", "for amit"). */
export function resolveTeamMemberFromText(text: string): string | undefined {
  const t = text.toLowerCase();
  const roster = getTeamMemberRoster();

  for (const m of roster) {
    const id = m.id.toLowerCase();
    const name = m.name.toLowerCase();
    const first = name.split(/\s+/)[0] ?? name;

    const patterns = [
      new RegExp(`\\bassign(?:ee)?\\s+(?:to|for)\\s+${first}\\b`, "i"),
      new RegExp(`\\bassign(?:ee)?\\s+(?:to\\s+)?${id}\\b`, "i"),
      new RegExp(`\\b(?:for|to)\\s+${first}\\b`, "i"),
      new RegExp(`\\b(?:for|to)\\s+${id}\\b`, "i"),
      new RegExp(`\\b${first}\\s+should\\b`, "i"),
      new RegExp(`\\bgive\\s+(?:it\\s+)?to\\s+${first}\\b`, "i"),
      new RegExp(`\\bgive\\s+(?:it\\s+)?to\\s+${id}\\b`, "i"),
      new RegExp(`\\b${first}\\s+(?:will|can)\\s+(?:do|handle)\\b`, "i"),
    ];

    if (patterns.some((p) => p.test(t))) return m.id;
  }

  return undefined;
}

/** Resolve id or display name to a roster member id. */
export function resolveTeamMemberRef(raw: string | undefined | null): string | undefined {
  const v = raw?.trim().toLowerCase();
  if (!v) return undefined;
  const roster = getTeamMemberRoster();
  const byId = roster.find((m) => m.id.toLowerCase() === v);
  if (byId) return byId.id;
  const byName = roster.find(
    (m) =>
      m.name.toLowerCase() === v ||
      m.name.toLowerCase().split(/\s+/)[0] === v
  );
  return byName?.id;
}
