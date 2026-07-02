import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getKiik69AccountsFromRequest } from "@/lib/kiik69-auth";
import { runKiik69AccountantChat, type Kiik69AiMessage } from "@/lib/kiik69-accountant-ai";
import { buildKiik69PurchaseStats } from "@/lib/kiik69-purchase-stats";
import { buildKiik69StockStats } from "@/lib/kiik69-stock-stats";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

export async function POST(req: NextRequest) {
  if (!(await getKiik69AccountsFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const raw = Array.isArray(body.messages) ? body.messages : [];
  const messages: Kiik69AiMessage[] = raw
    .filter(
      (m: unknown): m is Kiik69AiMessage =>
        Boolean(m) &&
        typeof m === "object" &&
        ((m as Kiik69AiMessage).role === "user" || (m as Kiik69AiMessage).role === "assistant") &&
        typeof (m as Kiik69AiMessage).content === "string"
    )
    .slice(-14);

  if (messages.length === 0 || messages[messages.length - 1]?.role !== "user") {
    return NextResponse.json({ error: "Send a user message" }, { status: 400 });
  }

  try {
    const [purchaseRows, stockItems, stockMovements] = await Promise.all([
      prisma.kiik69Purchase.findMany({
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
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
    const stats = buildKiik69PurchaseStats(purchaseRows);
    const stockStats = buildKiik69StockStats(stockItems, stockMovements);
    const reply = await runKiik69AccountantChat(messages, stats, stockStats);
    return NextResponse.json({ reply });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    const message = error instanceof Error ? error.message : "AI failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
