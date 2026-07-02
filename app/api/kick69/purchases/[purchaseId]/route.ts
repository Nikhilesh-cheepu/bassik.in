import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getKick69AccountsFromRequest } from "@/lib/kick69-auth";
import { parsePurchasePayload, toKick69PurchaseDto } from "@/lib/kick69-accounts";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ purchaseId: string }> }
) {
  if (!(await getKick69AccountsFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { purchaseId } = await params;
  try {
    await prisma.kick69Purchase.delete({ where: { id: purchaseId } });
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
  if (!(await getKick69AccountsFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { purchaseId } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const data = parsePurchasePayload(body);
    const row = await prisma.kick69Purchase.update({
      where: { id: purchaseId },
      data,
    });
    return NextResponse.json({ purchase: toKick69PurchaseDto(row) });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
