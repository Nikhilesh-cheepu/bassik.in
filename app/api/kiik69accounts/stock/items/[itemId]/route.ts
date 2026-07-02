import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getKiik69AccountsFromRequest } from "@/lib/kiik69-auth";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

/** Soft-delete item — stock in/out history is kept until cleared separately. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  if (!(await getKiik69AccountsFromRequest(_req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await params;
  if (!itemId) return NextResponse.json({ error: "Item id required" }, { status: 400 });

  try {
    const existing = await prisma.kiik69StockItem.findUnique({ where: { id: itemId } });
    if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    if (existing.deletedAt) return NextResponse.json({ success: true });

    await prisma.kiik69StockItem.update({
      where: { id: itemId },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    return NextResponse.json({ error: "Could not delete item" }, { status: 500 });
  }
}
