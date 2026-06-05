import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";

export const LEADS_MANAGER_COOKIE = "leads_manager_session";

const JWT_SECRET = new TextEncoder().encode(
  process.env.LEADS_MANAGER_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    "dev-leads-secret-change-in-production"
);

export function resolveLeadsManagerPassword(password: string): boolean {
  const expected =
    process.env.LEADS_MANAGER_PASSWORD?.trim() ||
    process.env.LEADS_PASSWORD?.trim() ||
    "leads";
  return password.trim() === expected;
}

export async function createLeadsManagerToken(): Promise<string> {
  return new SignJWT({ sub: "leads_manager" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyLeadsManagerSession(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.sub === "leads_manager";
  } catch {
    return false;
  }
}

export async function getLeadsManagerFromRequest(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(LEADS_MANAGER_COOKIE)?.value;
  if (!token) return false;
  return verifyLeadsManagerSession(token);
}

export async function getLeadsManagerFromCookies(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(LEADS_MANAGER_COOKIE)?.value;
  if (!token) return false;
  return verifyLeadsManagerSession(token);
}
