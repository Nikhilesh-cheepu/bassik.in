import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";

export const KICK69_ACCOUNTS_COOKIE = "kick69_accounts_session";

const JWT_SECRET = new TextEncoder().encode(
  process.env.KICK69_ACCOUNTS_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    "dev-kick69-accounts-secret-change-in-production"
);

export function resolveKick69AccountsPassword(password: string): boolean {
  const expected =
    process.env.KICK69_ACCOUNTS_PASSWORD?.trim() ||
    process.env.TEAM_ADMIN_PASSWORD?.trim() ||
    "522529";
  return password.trim() === expected;
}

export async function createKick69AccountsToken(): Promise<string> {
  return new SignJWT({ sub: "kick69_accounts" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("14d")
    .sign(JWT_SECRET);
}

export async function verifyKick69AccountsSession(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.sub === "kick69_accounts";
  } catch {
    return false;
  }
}

export async function getKick69AccountsFromRequest(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(KICK69_ACCOUNTS_COOKIE)?.value;
  if (!token) return false;
  return verifyKick69AccountsSession(token);
}

export async function getKick69AccountsFromCookies(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(KICK69_ACCOUNTS_COOKIE)?.value;
  if (!token) return false;
  return verifyKick69AccountsSession(token);
}
