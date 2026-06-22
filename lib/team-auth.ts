import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";

export const TEAM_COOKIE = "team_session";

export type TeamRole = "admin" | "member";

export type TeamSession = {
  username: string;
  role: TeamRole;
};

const JWT_SECRET = new TextEncoder().encode(
  process.env.TEAM_SESSION_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    "dev-team-secret-change-in-production"
);

function teamAccounts(): { username: string; password: string; role: TeamRole }[] {
  return [
    {
      username: "amit",
      password: process.env.TEAM_MEMBER_PASSWORD?.trim() || "amit01",
      role: "member",
    },
    {
      username: "admin",
      password: process.env.TEAM_ADMIN_PASSWORD?.trim() || "7013884485",
      role: "admin",
    },
  ];
}

export function resolveTeamLogin(password: string): TeamSession | null {
  const p = password.trim();
  if (!p) return null;
  const hit = teamAccounts().find((a) => a.password === p);
  if (!hit) return null;
  return { username: hit.username, role: hit.role };
}

export async function createTeamToken(session: TeamSession): Promise<string> {
  return new SignJWT({ sub: session.username, role: session.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("14d")
    .sign(JWT_SECRET);
}

export async function verifyTeamSession(token: string): Promise<TeamSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const username = typeof payload.sub === "string" ? payload.sub : "";
    const role = payload.role === "admin" ? "admin" : "member";
    if (!username) return null;
    return { username, role };
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
