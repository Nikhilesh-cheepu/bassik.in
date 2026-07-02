import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getKiik69AccountsFromRequest } from "@/lib/kiik69-auth";
import { buildKiik69StockStats } from "@/lib/kiik69-stock-stats";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

export async function GET(req: NextRequest) {
  if (!(await getKiik69AccountsFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [items, movements] = await Promise.all([
      prisma.kiik69StockItem.findMany({
        where: { deletedAt: null },
        include: {
          movements: { select: { direction: true, quantityBase: true, costInr: true } },
        },
      }),
      prisma.kiik69StockMovement.findMany({
        select: { direction: true, costInr: true, movementDate: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ]);

    return NextResponse.json({ stats: buildKiik69StockStats(items, movements) });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    return NextResponse.json({ error: "Could not load stock stats" }, { status: 500 });
  }
}
