import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { buildTeamWhatsAppReport, whatsAppShareUrl } from "@/lib/team-whatsapp-report";
import { prisma } from "@/lib/db";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await prisma.teamAdTask.findMany({
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });
    const text = buildTeamWhatsAppReport(rows);
    const phone = process.env.TEAM_WHATSAPP_PHONE?.trim() || null;
    return NextResponse.json({
      text,
      shareUrl: whatsAppShareUrl(text, phone),
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team whatsapp-report]", error);
    return NextResponse.json({ error: "Could not build report" }, { status: 500 });
  }
}
