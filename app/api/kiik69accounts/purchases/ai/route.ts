import { NextRequest, NextResponse } from "next/server";
import { getKiik69AccountsFromRequest } from "@/lib/kiik69-auth";
import { analyzeKiik69PurchaseBill } from "@/lib/kiik69-purchase-ai";
import {
  isKiik69PaymentMethod,
  isKiik69PurchaseItem,
  isKiik69PurchaseVendor,
  normalizeKiik69ItemSuggestion,
  normalizeKiik69VendorSuggestion,
} from "@/lib/kiik69-accounts";

export async function POST(req: NextRequest) {
  if (!(await getKiik69AccountsFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  const documentUrl =
    (typeof body.documentUrl === "string" ? body.documentUrl.trim() : "") || imageUrl;
  const mimeType = typeof body.mimeType === "string" ? body.mimeType.trim() : undefined;
  const docCategory = typeof body.docCategory === "string" ? body.docCategory.trim() : undefined;
  const vendor = typeof body.vendor === "string" ? body.vendor.trim() : undefined;
  const paymentMethod =
    typeof body.paymentMethod === "string" ? body.paymentMethod.trim() : undefined;
  const item = typeof body.item === "string" ? body.item.trim() : undefined;

  if (!documentUrl) {
    return NextResponse.json({ error: "Upload a bill first" }, { status: 400 });
  }

  try {
    const result = await analyzeKiik69PurchaseBill({
      documentUrl,
      mimeType,
      docCategory,
      vendor,
      paymentMethod,
      item,
    });
    const normalizedVendor = normalizeKiik69VendorSuggestion(result.suggestedVendor);
    const normalizedItem = normalizeKiik69ItemSuggestion(result.suggestedItem);

    return NextResponse.json({
      ...result,
      vendor: normalizedVendor && isKiik69PurchaseVendor(normalizedVendor) ? normalizedVendor : undefined,
      paymentMethod:
        result.suggestedPayment && isKiik69PaymentMethod(result.suggestedPayment)
          ? result.suggestedPayment
          : undefined,
      item: normalizedItem && isKiik69PurchaseItem(normalizedItem) ? normalizedItem : undefined,
      itemOther: result.suggestedItemName || undefined,
      description: result.notes || result.aiSummary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI scan failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
