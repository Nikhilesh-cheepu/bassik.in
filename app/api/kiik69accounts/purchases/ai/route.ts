import { NextRequest, NextResponse } from "next/server";
import { getKiik69AccountsFromRequest } from "@/lib/kiik69-auth";
import { analyzeKiik69PurchaseBill } from "@/lib/kiik69-purchase-ai";
import { isKiik69PaymentMethod, isKiik69PurchaseVendor } from "@/lib/kiik69-accounts";

export async function POST(req: NextRequest) {
  if (!(await getKiik69AccountsFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  const vendor = typeof body.vendor === "string" ? body.vendor.trim() : undefined;
  const paymentMethod =
    typeof body.paymentMethod === "string" ? body.paymentMethod.trim() : undefined;

  if (!imageUrl) {
    return NextResponse.json({ error: "Upload a bill first" }, { status: 400 });
  }

  try {
    const result = await analyzeKiik69PurchaseBill({ imageUrl, vendor, paymentMethod });
    return NextResponse.json({
      ...result,
      vendor:
        result.suggestedVendor && isKiik69PurchaseVendor(result.suggestedVendor)
          ? result.suggestedVendor
          : undefined,
      paymentMethod:
        result.suggestedPayment && isKiik69PaymentMethod(result.suggestedPayment)
          ? result.suggestedPayment
          : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI scan failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
