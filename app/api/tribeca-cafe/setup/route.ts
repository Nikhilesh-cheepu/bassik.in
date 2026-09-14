import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTribecaFromRequest } from "@/lib/tribeca-auth";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

const STATUSES = new Set(["todo", "doing", "done", "blocked"]);

export async function PATCH(req: NextRequest) {
  const session = await getTribecaFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "bassik") {
    return NextResponse.json({ error: "Only Bassik can update setup" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const status = typeof body.status === "string" ? body.status : "";
  const notes = typeof body.notes === "string" ? body.notes : undefined;
  if (!id || !STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const row = await prisma.tribecaSetupItem.update({
      where: { id },
      data: { status, ...(notes !== undefined ? { notes } : {}) },
    });
    return NextResponse.json({ item: row });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[tribeca setup PATCH]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
