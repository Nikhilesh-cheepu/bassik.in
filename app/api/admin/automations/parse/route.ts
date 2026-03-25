import { NextRequest, NextResponse } from "next/server";
import { ensureMainAdmin } from "@/lib/admin-api-guard";
import { suggestColumnMappingWithOpenAI } from "@/lib/automation/column-mapping-ai";
import { extractTabularFromUpload } from "@/lib/automation/extract-upload";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const authErr = await ensureMainAdmin(request);
    if (authErr) return authErr;

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing file field." }, { status: 400 });
    }

    const name = "name" in file && typeof (file as File).name === "string" ? (file as File).name : "upload";
    const mime = file.type || "application/octet-stream";

    const buf = Buffer.from(await file.arrayBuffer());
    const { kind, parsed } = await extractTabularFromUpload(buf, name, mime);
    const { headers, rows } = parsed;

    if (!headers.length) {
      return NextResponse.json(
        { error: "No columns detected. Try a clearer image or an Excel file." },
        { status: 400 }
      );
    }

    const sampleRows = rows.slice(0, 8);
    const suggestedMapping = await suggestColumnMappingWithOpenAI(headers, sampleRows);

    return NextResponse.json({
      fileName: name,
      sourceKind: kind,
      headers,
      rowCount: rows.length,
      sampleRows,
      suggestedMapping,
      openaiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
      truncatedList: Boolean((parsed as { truncated?: boolean }).truncated),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to read file.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
