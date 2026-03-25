import { NextRequest, NextResponse } from "next/server";
import type { AdminScope } from "@/lib/admin-auth";
import { getAdminScopeFromRequest } from "@/lib/admin-auth";

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function requireAdminScope(
  request: NextRequest
): Promise<AdminScope | NextResponse> {
  const scope = await getAdminScopeFromRequest(request);
  if (!scope) return unauthorized();
  return scope;
}

export function assertBrandInScope(scope: AdminScope, brandId: string): boolean {
  if (scope.kind === "main") return true;
  return scope.brandIds.includes(brandId);
}

export function assertMainAdmin(scope: AdminScope): NextResponse | null {
  if (scope.kind !== "main") return forbidden();
  return null;
}

/** null = main admin session OK; otherwise return the error response. */
export async function ensureMainAdmin(request: NextRequest): Promise<NextResponse | null> {
  const scope = await requireAdminScope(request);
  if (scope instanceof NextResponse) return scope;
  return assertMainAdmin(scope);
}

/** Returns an error response, or null when the session may access this brand. */
export async function guardBrandRoute(
  request: NextRequest,
  brandId: string
): Promise<NextResponse | null> {
  const scope = await requireAdminScope(request);
  if (scope instanceof NextResponse) return scope;
  if (!assertBrandInScope(scope, brandId)) return forbidden();
  return null;
}
