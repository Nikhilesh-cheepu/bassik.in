import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTribecaFromRequest } from "@/lib/tribeca-auth";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

const STATUSES = new Set(["todo", "doing", "live", "blocked"]);

export async function PATCH(req: NextRequest) {
  if (!(await getTribecaFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const status = typeof body.status === "string" ? body.status : "";
  const notes = typeof body.notes === "string" ? body.notes : undefined;
  if (!id || !STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const row = await prisma.tribecaChannel.update({
      where: { id },
      data: { status, ...(notes !== undefined ? { notes } : {}) },
    });
    return NextResponse.json({ channel: row });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[tribeca channel PATCH]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
