import type { ParsedSheet } from "./parse-xlsx";
import { detectUploadKind } from "./file-kind";
import { extractTableViaOpenAI } from "./openai-extract-table";

export type { ParsedSheet };

/**
 * All types go through OpenAI Responses API (native file / image), like ChatGPT.
 * Excel falls back to local xlsx parse if the API fails.
 */
export async function extractTabularFromUpload(
  buffer: Buffer,
  fileName: string,
  mime: string
): Promise<{ kind: "xlsx" | "image" | "pdf"; parsed: ParsedSheet }> {
  const kind = detectUploadKind(fileName, mime);
  if (!kind) {
    throw new Error("Unsupported type. Use Excel (.xlsx), PDF, or an image (JPEG, PNG, WebP).");
  }

  const parsed = await extractTableViaOpenAI(buffer, fileName, mime, kind);
  return { kind, parsed };
}
