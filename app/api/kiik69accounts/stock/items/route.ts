import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getKiik69AccountsFromRequest } from "@/lib/kiik69-auth";
import { parseStockItemPayload, toKiik69StockItemDto, type Kiik69StockCategory } from "@/lib/kiik69-stock";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

export async function GET(req: NextRequest) {
  if (!(await getKiik69AccountsFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const category = req.nextUrl.searchParams.get("category");
  const where =
    category === "food" || category === "liquor" ? { category: category as Kiik69StockCategory } : {};

  try {
    const items = await prisma.kiik69StockItem.findMany({
      where: {
        ...where,
        deletedAt: null,
      },
      orderBy: { name: "asc" },
      include: {
        movements: { select: { direction: true, quantityBase: true, costInr: true } },
      },
    });
    return NextResponse.json({
      items: items.map((i) => toKiik69StockItemDto(i, i.movements)),
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    return NextResponse.json({ error: "Could not load items" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await getKiik69AccountsFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  try {
    const data = parseStockItemPayload(body);
    const row = await prisma.kiik69StockItem.create({
      data: {
        name: data.name,
        category: data.category,
        baseUnit: data.baseUnit,
        costBasisQty: data.costBasisQty,
        costBasisUnit: data.costBasisUnit,
        costInr: data.costInr,
        bottleSizeBase: data.bottleSizeBase,
        notes: data.notes,
      },
      include: { movements: { select: { direction: true, quantityBase: true, costInr: true } } },
    });
    return NextResponse.json({ item: toKiik69StockItemDto(row, row.movements) });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    const message = error instanceof Error ? error.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
