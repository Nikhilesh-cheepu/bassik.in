import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getKiik69AccountsFromRequest, verifyKiik69DeletePassword } from "@/lib/kiik69-auth";
import {
  computeMovementBalances,
  enrichStockMovementDto,
  parseStockMovementPayload,
  toKiik69StockItemDto,
  toKiik69StockMovementDto,
  type Kiik69StockCategory,
  type Kiik69StockDirection,
} from "@/lib/kiik69-stock";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

async function remainingBase(itemId: string): Promise<number> {
  const movements = await prisma.kiik69StockMovement.findMany({
    where: { itemId },
    select: { direction: true, quantityBase: true },
  });
  let total = 0;
  for (const m of movements) {
    const q = Number(m.quantityBase);
    total += m.direction === "in" ? q : -q;
  }
  return Math.max(0, total);
}

export async function GET(req: NextRequest) {
  if (!(await getKiik69AccountsFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const category = req.nextUrl.searchParams.get("category");
  const direction = req.nextUrl.searchParams.get("direction");
  const where: { category?: Kiik69StockCategory; direction?: Kiik69StockDirection } = {};
  if (category === "food" || category === "liquor") where.category = category;
  if (direction === "in" || direction === "out") where.direction = direction;

  try {
    const rows = await prisma.kiik69StockMovement.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: 150,
      include: { item: { select: { name: true } } },
    });

    const itemIds = [...new Set(rows.map((r) => r.itemId))];
    const [balanceRows, items] = await Promise.all([
      itemIds.length
        ? prisma.kiik69StockMovement.findMany({
            where: { itemId: { in: itemIds } },
            select: {
              id: true,
              itemId: true,
              direction: true,
              quantityBase: true,
              costInr: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
      itemIds.length
        ? prisma.kiik69StockItem.findMany({
            where: { id: { in: itemIds } },
            select: {
              id: true,
              baseUnit: true,
              bottleSizeBase: true,
              costBasisQty: true,
              costBasisUnit: true,
              costInr: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const balances = computeMovementBalances(
      balanceRows.map((r) => ({
        id: r.id,
        itemId: r.itemId,
        direction: r.direction as Kiik69StockDirection,
        quantityBase: Number(r.quantityBase),
        costInr: Number(r.costInr),
        createdAt: r.createdAt.toISOString(),
      }))
    );
    const itemMap = new Map(items.map((i) => [i.id, i]));

    return NextResponse.json({
      movements: rows.map((row) => {
        const dto = toKiik69StockMovementDto(row);
        return enrichStockMovementDto(dto, balances.get(row.id), itemMap.get(row.itemId) ?? null);
      }),
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    return NextResponse.json({ error: "Could not load movements" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await getKiik69AccountsFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const itemId = typeof (body as { itemId?: string }).itemId === "string" ? (body as { itemId: string }).itemId : "";
  if (!itemId) return NextResponse.json({ error: "Item is required" }, { status: 400 });

  const bodyCategory = (body as { category?: string }).category;
  if (bodyCategory !== "food" && bodyCategory !== "liquor") {
    return NextResponse.json({ error: "Category (food or liquor) is required" }, { status: 400 });
  }

  try {
    const item = await prisma.kiik69StockItem.findUnique({ where: { id: itemId } });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    if (item.deletedAt) return NextResponse.json({ error: "Item was removed — pick another" }, { status: 400 });

    if (item.category !== bodyCategory) {
      return NextResponse.json(
        {
          error: `"${item.name}" is a ${item.category} item — use the ${item.category === "food" ? "Food" : "Liquor"} tab`,
        },
        { status: 400 }
      );
    }

    const data = parseStockMovementPayload(body, item);

    if (data.direction === "out") {
      const left = await remainingBase(itemId);
      if (data.quantityBase > left + 0.0001) {
        return NextResponse.json(
          { error: `Not enough stock (only ${left.toFixed(2)} ${item.baseUnit} left)` },
          { status: 400 }
        );
      }
    }

    const row = await prisma.kiik69StockMovement.create({
      data: {
        itemId,
        direction: data.direction,
        category: item.category,
        quantity: data.quantity,
        quantityUnit: data.quantityUnit,
        quantityBase: data.quantityBase,
        costInr: data.costInr,
        movementDate: data.movementDate,
        note: data.note,
        attachmentUrl: data.attachmentUrl,
        attachmentFileName: data.attachmentFileName,
        aiSummary: data.aiSummary,
      },
      include: { item: { select: { name: true } } },
    });

    const movements = await prisma.kiik69StockMovement.findMany({
      where: { itemId },
      select: { direction: true, quantityBase: true, costInr: true },
    });

    return NextResponse.json({
      movement: toKiik69StockMovementDto(row),
      item: toKiik69StockItemDto(item, movements),
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    const message = error instanceof Error ? error.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Clear stock history (password required). History stays until you explicitly clear it. */
export async function DELETE(req: NextRequest) {
  if (!(await getKiik69AccountsFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const deletePassword = typeof (body as { deletePassword?: string }).deletePassword === "string"
    ? (body as { deletePassword: string }).deletePassword
    : "";
  if (!verifyKiik69DeletePassword(deletePassword)) {
    return NextResponse.json({ error: "Wrong delete password" }, { status: 403 });
  }

  const category = (body as { category?: string }).category;
  const direction = (body as { direction?: string }).direction;
  const scope = (body as { scope?: string }).scope;

  const where: { category?: Kiik69StockCategory; direction?: Kiik69StockDirection } = {};
  if (category === "food" || category === "liquor") where.category = category;

  if (scope === "category") {
    if (!where.category) {
      return NextResponse.json({ error: "category is required" }, { status: 400 });
    }
  } else {
    if (direction === "in" || direction === "out") where.direction = direction;
    if (!where.category || !where.direction) {
      return NextResponse.json({ error: "category and direction required" }, { status: 400 });
    }
  }

  try {
    const result = await prisma.kiik69StockMovement.deleteMany({ where });
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    return NextResponse.json({ error: "Could not clear history" }, { status: 500 });
  }
}
