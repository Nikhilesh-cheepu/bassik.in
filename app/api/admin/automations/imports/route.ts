import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ensureMainAdmin } from "@/lib/admin-api-guard";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const authErr = await ensureMainAdmin(request);
    if (authErr) return authErr;

    const imports = await prisma.automationImport.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        fileName: true,
        rowCount: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ imports });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      return NextResponse.json({
        imports: [],
        warning:
          "Automation tables are not created yet. In the project folder run: npx prisma migrate deploy",
      });
    }
    console.error("[automations/imports]", e);
    return NextResponse.json({ error: "Failed to list imports." }, { status: 500 });
  }
}
