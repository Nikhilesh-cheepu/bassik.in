import { NextRequest, NextResponse } from "next/server";
import { ensureMainAdmin } from "@/lib/admin-api-guard";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authErr = await ensureMainAdmin(request);
  if (authErr) return authErr;

  const importId = request.nextUrl.searchParams.get("importId");
  if (!importId?.trim()) {
    return NextResponse.json({ error: "importId is required." }, { status: 400 });
  }

  try {
    const exists = await prisma.automationImport.findUnique({
      where: { id: importId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "Import not found." }, { status: 404 });
    }

    const contacts = await prisma.automationContact.findMany({
      where: { importId },
      orderBy: { createdAt: "asc" },
      take: 10_000,
      select: {
        id: true,
        fullName: true,
        phone: true,
        venue: true,
        extra: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ contacts });
  } catch (e) {
    console.error("[automations/contacts]", e);
    return NextResponse.json({ error: "Failed to load contacts." }, { status: 500 });
  }
}
