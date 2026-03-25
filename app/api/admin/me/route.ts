import { NextRequest, NextResponse } from "next/server";
import { getAdminScopeFromRequest } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const scope = await getAdminScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (scope.kind === "main") {
    return NextResponse.json({
      scope: "main" as const,
      brandIds: null as string[] | null,
    });
  }
  return NextResponse.json({
    scope: "outlet" as const,
    brandIds: scope.brandIds,
  });
}
