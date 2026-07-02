import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getKick69AccountsFromRequest } from "@/lib/kick69-auth";
import { parsePurchasePayload, toKick69PurchaseDto } from "@/lib/kick69-accounts";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

export async function GET(req: NextRequest) {
  if (!(await getKick69AccountsFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await prisma.kick69Purchase.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ purchases: rows.map(toKick69PurchaseDto) });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[kick69 purchases GET]", error);
    return NextResponse.json({ error: "Could not load purchases" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await getKick69AccountsFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  try {
    const data = parsePurchasePayload(body);
    const row = await prisma.kick69Purchase.create({
      data: {
        ...data,
        createdBy: "admin",
      },
    });
    return NextResponse.json({ purchase: toKick69PurchaseDto(row) });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    const message = error instanceof Error ? error.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
