import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getKiik69AccountsFromRequest } from "@/lib/kiik69-auth";
import { buildWalletSummary, parseWalletPayload, toKiik69WalletEntryDto } from "@/lib/kiik69-wallet";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

export async function GET(req: NextRequest) {
  if (!(await getKiik69AccountsFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await prisma.kiik69WalletEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ wallet: buildWalletSummary(rows) });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    return NextResponse.json({ error: "Could not load wallet" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await getKiik69AccountsFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  try {
    const data = parseWalletPayload(body);
    const latest = await prisma.kiik69WalletEntry.findFirst({
      orderBy: { createdAt: "desc" },
    });
    const current = latest ? Number(latest.balanceAfter) : 0;
    const delta = data.type === "deposit" ? data.amountInr : -data.amountInr;
    const balanceAfter = Math.round((current + delta) * 100) / 100;

    if (balanceAfter < 0) {
      return NextResponse.json({ error: "Not enough wallet cash" }, { status: 400 });
    }

    const row = await prisma.kiik69WalletEntry.create({
      data: {
        type: data.type,
        amountInr: data.amountInr,
        balanceAfter,
        note: data.note,
        entryDate: data.entryDate,
      },
    });

    return NextResponse.json({ entry: toKiik69WalletEntryDto(row), balanceAfter });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    const message = error instanceof Error ? error.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
