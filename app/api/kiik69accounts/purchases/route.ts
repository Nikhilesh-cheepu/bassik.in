import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getKiik69AccountsFromRequest } from "@/lib/kiik69-auth";
import { parsePurchasePayload, toKiik69PurchaseDto } from "@/lib/kiik69-accounts";
import { upsertKiik69CustomOptionsFromPurchase } from "@/lib/kiik69-custom-options-db";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

export async function GET(req: NextRequest) {
  if (!(await getKiik69AccountsFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await prisma.kiik69Purchase.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ purchases: rows.map(toKiik69PurchaseDto) });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[kiik69 purchases GET]", error);
    return NextResponse.json({ error: "Could not load purchases" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await getKiik69AccountsFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  try {
    const data = parsePurchasePayload(body);
    await upsertKiik69CustomOptionsFromPurchase(data);
    const row = await prisma.kiik69Purchase.create({
      data: {
        ...data,
        createdBy: "admin",
      },
    });
    return NextResponse.json({ purchase: toKiik69PurchaseDto(row) });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    const message = error instanceof Error ? error.message : "Save failed";
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
