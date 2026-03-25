import { NextRequest, NextResponse } from "next/server";
import { ensureMainAdmin } from "@/lib/admin-api-guard";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { extractTabularFromUpload } from "@/lib/automation/extract-upload";
import { mapAllRows } from "@/lib/automation/apply-mapping";
import { sanitizeMappings } from "@/lib/automation/validate-mapping";
import type { ColumnMapping } from "@/lib/automation/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const authErr = await ensureMainAdmin(request);
    if (authErr) return authErr;

    const form = await request.formData();
    const file = form.get("file");
    const mappingRaw = form.get("mapping");

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing file field." }, { status: 400 });
    }
    if (typeof mappingRaw !== "string") {
      return NextResponse.json({ error: "Missing mapping JSON." }, { status: 400 });
    }

    let mappings: ColumnMapping[];
    try {
      mappings = JSON.parse(mappingRaw) as ColumnMapping[];
    } catch {
      return NextResponse.json({ error: "Invalid mapping JSON." }, { status: 400 });
    }
    if (!Array.isArray(mappings)) {
      return NextResponse.json({ error: "Mapping must be an array." }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const fileName =
      "name" in file && typeof (file as File).name === "string" ? (file as File).name : "upload";
    const mime = file.type || "application/octet-stream";
    const { parsed } = await extractTabularFromUpload(buf, fileName, mime);
    const { headers, rows } = parsed;
    const sanitized = sanitizeMappings(mappings, headers);
    if (typeof sanitized === "string") {
      return NextResponse.json({ error: sanitized }, { status: 400 });
    }

    const { contacts, skipped } = mapAllRows(rows, sanitized);
    if (contacts.length === 0) {
      return NextResponse.json(
        { error: "No rows with a valid phone number after mapping. Check your phone column." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const imp = await tx.automationImport.create({
        data: {
          fileName,
          rowCount: contacts.length,
          mapping: sanitized as unknown as Prisma.InputJsonValue,
          headers: headers as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.automationContact.createMany({
        data: contacts.map((c) => ({
          importId: imp.id,
          fullName: c.fullName,
          phone: c.phone,
          venue: c.venue,
          ...(c.extra != null ? { extra: c.extra } : {}),
        })),
      });

      return imp;
    });

    return NextResponse.json({
      importId: result.id,
      savedCount: contacts.length,
      skippedRows: skipped,
      totalDataRows: rows.length,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      return NextResponse.json(
        {
          error:
            "Automation tables missing. In the project folder run: npx prisma migrate deploy",
        },
        { status: 503 }
      );
    }
    const msg = e instanceof Error ? e.message : "Import failed.";
    console.error("[automations/import]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
