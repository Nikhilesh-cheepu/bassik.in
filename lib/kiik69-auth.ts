import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";

export const KIIK69_ACCOUNTS_COOKIE = "kiik69_accounts_session";

const JWT_SECRET = new TextEncoder().encode(
  process.env.KIIK69_ACCOUNTS_SECRET?.trim() ||
    process.env.KICK69_ACCOUNTS_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET ||
    "dev-kiik69-accounts-secret-change-in-production"
);

export function verifyKiik69DeletePassword(password: string): boolean {
  const expected = process.env.KIIK69_DELETE_PASSWORD?.trim() || "9550";
  return password.trim() === expected;
}

export function resolveKiik69AccountsPassword(password: string): boolean {
  const expected =
    process.env.KIIK69_ACCOUNTS_PASSWORD?.trim() ||
    process.env.KICK69_ACCOUNTS_PASSWORD?.trim() ||
    process.env.TEAM_ADMIN_PASSWORD?.trim() ||
    "522529";
  return password.trim() === expected;
}

export async function createKiik69AccountsToken(): Promise<string> {
  return new SignJWT({ sub: "kiik69_accounts" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("14d")
    .sign(JWT_SECRET);
}

export async function verifyKiik69AccountsSession(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.sub === "kiik69_accounts";
  } catch {
    return false;
  }
}

export function isKiik69AccountsAuthRequired(): boolean {
  return process.env.KIIK69_ACCOUNTS_REQUIRE_AUTH === "true";
}

export async function getKiik69AccountsFromRequest(request: NextRequest): Promise<boolean> {
  if (!isKiik69AccountsAuthRequired()) return true;
  const token = request.cookies.get(KIIK69_ACCOUNTS_COOKIE)?.value;
  if (!token) return false;
  return verifyKiik69AccountsSession(token);
}

export async function getKiik69AccountsFromCookies(): Promise<boolean> {
  if (!isKiik69AccountsAuthRequired()) return true;
  const jar = await cookies();
  const token = jar.get(KIIK69_ACCOUNTS_COOKIE)?.value;
  if (!token) return false;
  return verifyKiik69AccountsSession(token);
}
