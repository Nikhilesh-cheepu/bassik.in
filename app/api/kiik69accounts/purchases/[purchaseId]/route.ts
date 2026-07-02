import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getKiik69AccountsFromRequest } from "@/lib/kiik69-auth";
import { parsePurchasePayload, toKiik69PurchaseDto } from "@/lib/kiik69-accounts";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ purchaseId: string }> }
) {
  if (!(await getKiik69AccountsFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { purchaseId } = await params;
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
    const row = await prisma.kiik69Purchase.update({
      where: { id: purchaseId },
      data,
    });
    return NextResponse.json({ purchase: toKiik69PurchaseDto(row) });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
