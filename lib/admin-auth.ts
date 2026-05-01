import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { CLUB_ROGUE_BRAND_IDS } from "@/lib/club-rogue";

const COOKIE_NAME = "admin_session";
const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_SESSION_SECRET || "dev-secret-change-in-production"
);

/** 4-digit passcode → scope (server-side only). */
const PASSCODE_TO_SCOPE: Record<
  string,
  { kind: "main" } | { kind: "outlet"; brandIds: readonly string[] }
> = {
  "7013": { kind: "main" },
  "5050": { kind: "outlet", brandIds: ["sound-of-soul", "skyhy"] },
  "1010": { kind: "outlet", brandIds: CLUB_ROGUE_BRAND_IDS },
  "2020": { kind: "outlet", brandIds: ["firefly"] },
};

export type AdminScope =
  | { kind: "main" }
  | { kind: "outlet"; brandIds: string[] };

export function resolveAdminPasscode(password: string): AdminScope | null {
  const row = PASSCODE_TO_SCOPE[password];
  if (!row) return null;
  if (row.kind === "main") return { kind: "main" };
  return { kind: "outlet", brandIds: [...row.brandIds] };
}

export async function createAdminToken(scope: AdminScope): Promise<string> {
  const payload: Record<string, unknown> = { sub: "admin" };
  if (scope.kind === "main") {
    payload.scope = "main";
  } else {
    payload.scope = "outlet";
    payload.brands = scope.brandIds;
  }
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifyAdminSession(token: string): Promise<AdminScope | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.sub !== "admin") return null;
    if (payload.scope === "outlet" && Array.isArray(payload.brands)) {
      const ids = (payload.brands as unknown[]).filter((b): b is string => typeof b === "string");
      if (ids.length === 0) return null;
      return { kind: "outlet", brandIds: ids };
    }
    return { kind: "main" };
  } catch {
    return null;
  }
}

export async function getAdminScopeFromRequest(
  request: NextRequest
): Promise<AdminScope | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

export async function getAdminSession(request: NextRequest): Promise<boolean> {
  const scope = await getAdminScopeFromRequest(request);
  return scope !== null;
}

export async function getAdminScopeFromCookies(): Promise<AdminScope | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

export async function getAdminSessionFromCookies(): Promise<boolean> {
  const s = await getAdminScopeFromCookies();
  return s !== null;
}

/** @deprecated Use verifyAdminSession; kept for any legacy imports. */
export async function verifyAdminToken(token: string): Promise<boolean> {
  const s = await verifyAdminSession(token);
  return s !== null;
}

export function loginRedirectForScope(scope: AdminScope): string {
  return "/admin/dashboard";
}

export { COOKIE_NAME };
