import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";

export const TRIBECA_COOKIE = "tribeca_cafe_session";

const JWT_SECRET = new TextEncoder().encode(
  process.env.TRIBECA_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET ||
    "dev-tribeca-cafe-secret-change-in-production"
);

export function isTribecaAuthRequired(): boolean {
  return process.env.TRIBECA_REQUIRE_AUTH !== "false";
}

export function resolveTribecaPassword(password: string): boolean {
  const expected = process.env.TRIBECA_PORTAL_PASSWORD?.trim() || "kompally";
  return password.trim() === expected;
}

export async function createTribecaToken(): Promise<string> {
  return new SignJWT({ sub: "tribeca_cafe" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("14d")
    .sign(JWT_SECRET);
}

export async function verifyTribecaSession(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.sub === "tribeca_cafe";
  } catch {
    return false;
  }
}

export async function getTribecaFromRequest(request: NextRequest): Promise<boolean> {
  if (!isTribecaAuthRequired()) return true;
  const token = request.cookies.get(TRIBECA_COOKIE)?.value;
  if (!token) return false;
  return verifyTribecaSession(token);
}

export async function getTribecaFromCookies(): Promise<boolean> {
  if (!isTribecaAuthRequired()) return true;
  const jar = await cookies();
  const token = jar.get(TRIBECA_COOKIE)?.value;
  if (!token) return false;
  return verifyTribecaSession(token);
}
