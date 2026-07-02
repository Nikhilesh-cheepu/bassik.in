import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getKiik69AccountsFromRequest, verifyKiik69DeletePassword } from "@/lib/kiik69-auth";
import { parsePurchasePayload, toKiik69PurchaseDto } from "@/lib/kiik69-accounts";
import { upsertKiik69CustomOptionsFromPurchase } from "@/lib/kiik69-custom-options-db";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ purchaseId: string }> }
) {
  if (!(await getKiik69AccountsFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { purchaseId } = await params;
  const body = await req.json().catch(() => ({}));
  const deletePassword = typeof body.deletePassword === "string" ? body.deletePassword : "";
  if (!verifyKiik69DeletePassword(deletePassword)) {
    return NextResponse.json({ error: "Wrong delete password" }, { status: 403 });
  }

  try {
    await prisma.kiik69Purchase.delete({ where: { id: purchaseId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ purchaseId: string }> }
) {
  if (!(await getKiik69AccountsFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { purchaseId } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const data = parsePurchasePayload(body);
    await upsertKiik69CustomOptionsFromPurchase(data);
    const row = await prisma.kiik69Purchase.update({
      where: { id: purchaseId },
      data,
    });
    return NextResponse.json({ purchase: toKiik69PurchaseDto(row) });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    const message = error instanceof Error ? error.message : "Update failed";
    if (message.includes("Unknown argument")) {
      return NextResponse.json(
        {
          error:
            "Database schema out of date. Stop the dev server, run: npx prisma generate && rm -rf .next && npm run dev",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
