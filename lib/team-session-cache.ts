import type { TeamRole } from "@/lib/team-auth";

export type CachedTeamUser = {
  username: string;
  role: TeamRole;
  memberId?: string;
};

const KEY = "team_session_user_v1";

export function readCachedTeamUser(): CachedTeamUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedTeamUser;
    if (!parsed?.username || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedTeamUser(user: CachedTeamUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) sessionStorage.setItem(KEY, JSON.stringify(user));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* ignore quota / private mode */
  }
}
