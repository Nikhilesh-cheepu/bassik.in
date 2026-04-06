import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdminScope } from "@/lib/admin-api-guard";
import { getVenuesForAdminScope } from "@/lib/admin-venues-list";

export const runtime = "nodejs";

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/** One round-trip for admin shell: `me` + full venues list (replaces /me + /venues). */
export async function GET(request: NextRequest) {
  try {
    const scopeRes = await requireAdminScope(request);
    if (scopeRes instanceof NextResponse) return scopeRes;
    const scope = scopeRes;

    const me =
      scope.kind === "main"
        ? { scope: "main" as const, brandIds: null as string[] | null }
        : { scope: "outlet" as const, brandIds: scope.brandIds };

    const venues = await getVenuesForAdminScope(scope);

    return NextResponse.json({ me, venues }, { headers: noCacheHeaders });
  } catch (error) {
    const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null;
    console.error("[venue-session]", error);
    if (code) console.error("Prisma code:", code);
    return NextResponse.json(
      { me: { scope: "main" as const, brandIds: null }, venues: [] },
      { status: 200, headers: noCacheHeaders }
    );
  }
}
