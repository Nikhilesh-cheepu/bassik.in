import { getTeamMemberPasswords, getTeamMemberRoster, isTeamMemberId } from "@/lib/team-members";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";

export const TEAM_COOKIE = "team_session";

export type TeamRole = "admin" | "member" | "viewer" | "poc";

export type TeamSession = {
  username: string;
  role: TeamRole;
  memberId?: string;
};

const JWT_SECRET = new TextEncoder().encode(
  process.env.TEAM_SESSION_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    "dev-team-secret-change-in-production"
);

function teamAccounts(): { username: string; password: string; role: TeamRole; memberId?: string }[] {
  const passwords = getTeamMemberPasswords();
  const members = getTeamMemberRoster()
    .map((m) => ({
      username: m.id,
      password: passwords[m.id]?.trim() ?? "",
      role: (m.kind === "poc" ? "poc" : "member") as TeamRole,
      memberId: m.id,
    }))
    .filter((m) => m.password);

  return [
    ...members,
    {
      username: "admin",
      password: process.env.TEAM_ADMIN_PASSWORD?.trim() || "9154858528",
      role: "admin",
    },
    {
      username: "viewer",
      password: process.env.TEAM_VIEWER_PASSWORD?.trim() || "view01",
      role: "viewer",
    },
  ];
}

export function resolveTeamLogin(password: string): TeamSession | null {
  const p = password.trim();
  if (!p) return null;
  const hit = teamAccounts().find((a) => a.password === p);
  if (!hit) return null;
  return {
    username: hit.username,
    role: hit.role,
    ...(hit.memberId ? { memberId: hit.memberId } : {}),
  };
}

export async function createTeamToken(session: TeamSession): Promise<string> {
  return new SignJWT({
    sub: session.username,
    role: session.role,
    memberId: session.memberId ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("14d")
    .sign(JWT_SECRET);
}

export async function verifyTeamSession(token: string): Promise<TeamSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const username = typeof payload.sub === "string" ? payload.sub : "";
    const role: TeamRole =
      payload.role === "admin"
        ? "admin"
        : payload.role === "viewer"
          ? "viewer"
          : payload.role === "poc"
            ? "poc"
            : "member";
    if (!username) return null;
    if (role === "viewer") return { username, role };
    const memberId =
      typeof payload.memberId === "string" && isTeamMemberId(payload.memberId)
        ? payload.memberId
        : (role === "member" || role === "poc") && isTeamMemberId(username)
          ? username
          : undefined;
    return { username, role, memberId };
  } catch {
    return null;
  }
}

export async function getTeamFromRequest(request: NextRequest): Promise<TeamSession | null> {
  const token = request.cookies.get(TEAM_COOKIE)?.value;
  if (!token) return null;
  return verifyTeamSession(token);
}

export async function getTeamFromCookies(): Promise<TeamSession | null> {
  const jar = await cookies();
  const token = jar.get(TEAM_COOKIE)?.value;
  if (!token) return null;
  return verifyTeamSession(token);
}

export function isMemberLikeRole(role: TeamRole): boolean {
  return role === "member" || role === "poc";
}
