import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTribecaFromRequest } from "@/lib/tribeca-auth";
import { CAMPAIGN_STAGES, nextCampaignStage } from "@/lib/tribeca";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

export async function PATCH(req: NextRequest) {
  const session = await getTribecaFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "bassik") {
    return NextResponse.json({ error: "Only Bassik can update campaigns" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const notes = typeof body.notes === "string" ? body.notes : undefined;
  let stage = typeof body.stage === "string" ? body.stage : "";
  const advance = body.advance === true;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    if (advance) {
      const current = await prisma.tribecaCampaign.findUnique({ where: { id } });
      if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
      stage = nextCampaignStage(current.stage);
    }
    if (!CAMPAIGN_STAGES.includes(stage as (typeof CAMPAIGN_STAGES)[number])) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }
    const row = await prisma.tribecaCampaign.update({
      where: { id },
      data: { stage, ...(notes !== undefined ? { notes } : {}) },
    });
    return NextResponse.json({ campaign: row });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[tribeca campaign PATCH]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
