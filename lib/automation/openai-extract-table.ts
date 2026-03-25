import OpenAI from "openai";
import { coerceParsedSheet, type CoercedSheet } from "./coerce-table";
import type { UploadKind } from "./file-kind";
import { parseXlsxFirstSheet } from "./parse-xlsx";

const MAX_BYTES = 32 * 1024 * 1024;

const EXTRACT_BASE = `This file may be a spreadsheet, PDF, scan, photo, or screenshot of a guest/contact list.

Extract the main data table (names, phones, venues, ages, notes, etc.).

Section metadata (IMPORTANT):
- Many files contain multiple sections/tables like:
  "WALKING GUEST LIST OF 12/02/2026" and "BOOKING GUEST LIST OF 12/02/2026".
- For EVERY row, also output:
  - "visit_date": the section header date converted to ISO format "YYYY-MM-DD"
  - "visit_type": one of "walkin" or "booking" based on which section/table the row came from
- If a date/type cannot be determined confidently for a row, use "" for that field.

Return ONLY valid JSON (no markdown, no code fences):
{"headers":["column1","column2",...],"rows":[{"column1":"value","column2":"value"},...],"truncated":false}

Rules:
- Every cell value must be a string; use "" for empty.
- Use clear header names matching what you see or sensible names (phone, name, venue, age, gender, notes).
- One object in "rows" per person/row of data.
- If there are multiple separate tables of the same kind, merge them into one "rows" list with shared headers.
- If nothing usable exists: {"headers":[],"rows":[],"truncated":false}
- Ensure headers include "visit_date" and "visit_type" whenever you can detect section headers (like walking/booking guest list dates).
- CRITICAL: Your output MUST be parseable JSON. If you are running out of space, stop adding rows after the LAST COMPLETE row object, then close the "rows" array with ] and the root with }. Never end mid-string or mid-object.
- If you had to omit rows because of size, set "truncated": true. Prefer fewer complete rows over broken JSON.`;

const EXTRACT_PDF_MULTI_PAGE = `

PDF — MULTI-PAGE:
- Read all pages in order. Merge rows into one list; skip repeated header lines on each new page.
- If there are hundreds of rows, include at most 350 complete rows (from the start of the document), set "truncated": true, and still output valid closed JSON. Never truncate mid-value.`;

const EXTRACT_XLSX_MULTI_SHEET = `

Excel — MULTI-SHEET:
- If there are multiple sheets with contact/list data, merge all such rows into one "rows" array with consistent headers (map columns across sheets).`;

function parseModelTableJson(text: string): CoercedSheet {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    const msg = e instanceof SyntaxError ? e.message : String(e);
    if (/unterminated|position|unexpected end|unexpected token/i.test(msg)) {
      throw new Error(
        "This file produced too much data in one go, so the AI answer was cut off and could not be read. Try: save as Excel and upload, or split the PDF into smaller parts and upload each part."
      );
    }
    throw new Error("Could not read the AI result. Try again or use a smaller file.");
  }
  return coerceParsedSheet(raw);
}

function extractInstruction(kind: UploadKind): string {
  if (kind === "pdf") return EXTRACT_BASE + EXTRACT_PDF_MULTI_PAGE;
  if (kind === "xlsx") return EXTRACT_BASE + EXTRACT_XLSX_MULTI_SHEET;
  return EXTRACT_BASE;
}

function safeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() || "file";
  const cleaned = base.replace(/[^\w.\s-]+/g, "_").trim().slice(0, 120);
  return cleaned || "file";
}

function dataMimeForUpload(kind: UploadKind, fileName: string, mime: string): string {
  const lower = fileName.toLowerCase();
  if (kind === "pdf") return "application/pdf";
  if (kind === "xlsx") {
    if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  const m = mime.toLowerCase().split(";")[0].trim();
  if (m === "image/jpg") return "image/jpeg";
  if (m.startsWith("image/")) return m;
  return "application/octet-stream";
}

/**
 * ChatGPT-style: send the raw file to OpenAI (PDF / Excel / image) via Responses API.
 */
export async function extractTableViaOpenAI(
  buffer: Buffer,
  fileName: string,
  mime: string,
  kind: UploadKind
): Promise<CoercedSheet> {
  if (buffer.length > MAX_BYTES) {
    throw new Error("File is too large (max 32MB).");
  }

  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    if (kind === "xlsx") {
      return parseXlsxFirstSheet(buffer) as CoercedSheet;
    }
    throw new Error("OPENAI_API_KEY is required for PDF and images.");
  }

  const model =
    process.env.OPENAI_DOCUMENT_MODEL?.trim() ||
    process.env.OPENAI_VISION_MODEL?.trim() ||
    "gpt-4o";

  const client = new OpenAI({ apiKey: key });
  const b64 = buffer.toString("base64");
  const dataMime = dataMimeForUpload(kind, fileName, mime);
  const fname = safeFilename(fileName);
  const dataUrl = `data:${dataMime};base64,${b64}`;

  const instruction = extractInstruction(kind);

  const userContent =
    kind === "image"
      ? [
          { type: "input_text" as const, text: instruction },
          { type: "input_image" as const, detail: "high" as const, image_url: dataUrl },
        ]
      : [
          { type: "input_text" as const, text: instruction },
          { type: "input_file" as const, filename: fname, file_data: dataUrl },
        ];

  try {
    const maxOut = Number(process.env.OPENAI_EXTRACT_MAX_OUTPUT_TOKENS || "32768");
    const response = await client.responses.create({
      model,
      input: [
        {
          role: "user" as const,
          content: [...userContent],
        },
      ],
      text: {
        format: { type: "json_object" },
      },
      temperature: 0.1,
      max_output_tokens: Number.isFinite(maxOut) && maxOut > 0 ? maxOut : 32768,
      truncation: "auto",
    });

    const text = response.output_text?.trim();
    if (!text) {
      throw new Error("OpenAI returned no text. Try a smaller file or set OPENAI_DOCUMENT_MODEL=gpt-4o.");
    }

    const sheet = parseModelTableJson(text);
    if (response.status === "incomplete" || sheet.truncated) {
      console.warn("[openai-extract] Incomplete or truncated table output.");
    }
    return sheet;
  } catch (err) {
    if (kind === "xlsx") {
      console.warn("[openai-extract] OpenAI path failed, using local Excel parse:", err);
      return parseXlsxFirstSheet(buffer) as CoercedSheet;
    }
    throw err;
  }
}
