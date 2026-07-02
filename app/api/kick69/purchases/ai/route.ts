import { NextRequest, NextResponse } from "next/server";
import { getKick69AccountsFromRequest } from "@/lib/kick69-auth";
import { analyzeKick69PurchaseBill } from "@/lib/kick69-purchase-ai";
import { isKick69PaymentMethod, isKick69PurchaseVendor } from "@/lib/kick69-accounts";

export async function POST(req: NextRequest) {
  if (!(await getKick69AccountsFromRequest(req))) {
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
    const result = await analyzeKick69PurchaseBill({ imageUrl, vendor, paymentMethod });
    return NextResponse.json({
      ...result,
      vendor:
        result.suggestedVendor && isKick69PurchaseVendor(result.suggestedVendor)
          ? result.suggestedVendor
          : undefined,
      paymentMethod:
        result.suggestedPayment && isKick69PaymentMethod(result.suggestedPayment)
          ? result.suggestedPayment
          : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI scan failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
