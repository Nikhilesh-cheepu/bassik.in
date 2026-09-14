import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTribecaFromRequest } from "@/lib/tribeca-auth";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

export async function POST(req: NextRequest) {
  const session = await getTribecaFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const monthId = typeof body.monthId === "string" ? body.monthId : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const bodyText = typeof body.body === "string" ? body.body : null;
  if (!monthId || !title) {
    return NextResponse.json({ error: "monthId and title required" }, { status: 400 });
  }

  try {
    const row = await prisma.tribecaRequest.create({
      data: {
        monthId,
        title,
        body: bodyText,
        fromRole: session.role,
      },
    });
    return NextResponse.json({ request: row });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[tribeca request POST]", error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getTribecaFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const status = typeof body.status === "string" ? body.status : undefined;
  const answer = typeof body.answer === "string" ? body.answer : undefined;
  if (status && !["open", "answered", "done"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const row = await prisma.tribecaRequest.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(answer !== undefined ? { answer, status: status ?? "answered" } : {}),
      },
    });
    return NextResponse.json({ request: row });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[tribeca request PATCH]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
