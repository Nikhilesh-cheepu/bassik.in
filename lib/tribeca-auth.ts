import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";

export const TRIBECA_COOKIE = "tribeca_cafe_session";

export type TribecaRole = "bassik" | "owner";

type TribecaSession = {
  role: TribecaRole;
};

const JWT_SECRET = new TextEncoder().encode(
  process.env.TRIBECA_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET ||
    "dev-tribeca-cafe-secret-change-in-production"
);

export function isTribecaAuthRequired(): boolean {
  return process.env.TRIBECA_REQUIRE_AUTH !== "false";
}

export function resolveTribecaLogin(password: string): TribecaRole | null {
  const trimmed = password.trim();
  const bassik =
    process.env.TRIBECA_PORTAL_PASSWORD?.trim() ||
    process.env.TEAM_ADMIN_PASSWORD?.trim() ||
    "tribeca";
  const owner = process.env.TRIBECA_OWNER_PASSWORD?.trim() || "tribeca-owner";
  if (trimmed === bassik) return "bassik";
  if (trimmed === owner) return "owner";
  return null;
}

export async function createTribecaToken(role: TribecaRole): Promise<string> {
  return new SignJWT({ sub: "tribeca_cafe", role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("14d")
    .sign(JWT_SECRET);
}

export async function verifyTribecaSession(token: string): Promise<TribecaSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.sub !== "tribeca_cafe") return null;
    const role = payload.role === "owner" ? "owner" : "bassik";
    return { role };
  } catch {
    return null;
  }
}

export async function getTribecaFromRequest(request: NextRequest): Promise<TribecaSession | null> {
  if (!isTribecaAuthRequired()) return { role: "bassik" };
  const token = request.cookies.get(TRIBECA_COOKIE)?.value;
  if (!token) return null;
  return verifyTribecaSession(token);
}

export async function getTribecaFromCookies(): Promise<TribecaSession | null> {
  if (!isTribecaAuthRequired()) return { role: "bassik" };
  const jar = await cookies();
  const token = jar.get(TRIBECA_COOKIE)?.value;
  if (!token) return null;
  return verifyTribecaSession(token);
}
