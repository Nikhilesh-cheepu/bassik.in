import { NextRequest, NextResponse } from "next/server";
import { requireAdminScope, assertBrandInScope, forbidden } from "@/lib/admin-api-guard";
import { approveUserReview, deleteUserReview, listAdminReviews } from "@/lib/home-reviews";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const scopeRes = await requireAdminScope(request);
  if (scopeRes instanceof NextResponse) return scopeRes;
  const scope = scopeRes;

  const all = await listAdminReviews(400);
  if (scope.kind === "main") {
    return NextResponse.json({ reviews: all });
  }
  const filtered = all.filter((r) => scope.brandIds.includes(r.brandId));
  return NextResponse.json({ reviews: filtered });
}

export async function PATCH(request: NextRequest) {
  const scopeRes = await requireAdminScope(request);
  if (scopeRes instanceof NextResponse) return scopeRes;
  const scope = scopeRes;
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const brandId = typeof body.brandId === "string" ? body.brandId.trim() : "";
  if (!id || !brandId) return NextResponse.json({ error: "Missing id/brandId" }, { status: 400 });
  if (!assertBrandInScope(scope, brandId)) return forbidden();
  const ok = await approveUserReview(id);
  if (!ok) return NextResponse.json({ error: "Could not approve review." }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const scopeRes = await requireAdminScope(request);
  if (scopeRes instanceof NextResponse) return scopeRes;
  const scope = scopeRes;
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const brandId = typeof body.brandId === "string" ? body.brandId.trim() : "";
  if (!id || !brandId) return NextResponse.json({ error: "Missing id/brandId" }, { status: 400 });
  if (!assertBrandInScope(scope, brandId)) return forbidden();
  const ok = await deleteUserReview(id);
  if (!ok) return NextResponse.json({ error: "Could not delete review." }, { status: 500 });
  return NextResponse.json({ success: true });
}
