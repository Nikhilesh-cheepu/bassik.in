export type UploadKind = "xlsx" | "image" | "pdf";

export function detectUploadKind(fileName: string, mime: string): UploadKind | null {
  const lower = fileName.toLowerCase();
  const m = mime.toLowerCase().split(";")[0].trim();

  if (/\.xlsx?$/i.test(lower) || m.includes("spreadsheet")) return "xlsx";
  if (/\.pdf$/i.test(lower) || m === "application/pdf") return "pdf";
  if (m.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(lower)) return "image";

  return null;
}
