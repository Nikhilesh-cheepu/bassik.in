import * as XLSX from "xlsx";

export type ParsedSheet = {
  headers: string[];
  /** One object per data row; keys are exact header strings */
  rows: Record<string, string>[];
};

/**
 * Reads the first worksheet; row 1 = headers. Trims header names and cell strings.
 */
export function parseXlsxFirstSheet(buffer: Buffer): ParsedSheet {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const name = wb.SheetNames[0];
  if (!name) {
    throw new Error("The workbook has no sheets.");
  }
  const sheet = wb.Sheets[name];
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null | undefined)[]>(
    sheet,
    { header: 1, defval: "", raw: false }
  ) as unknown[][];

  if (!matrix.length) {
    throw new Error("The first sheet is empty.");
  }

  const headerRow = matrix[0] ?? [];
  const headers = headerRow.map((cell, i) => {
    const s = String(cell ?? "").trim();
    return s || `Column_${i + 1}`;
  });

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const line = matrix[r] ?? [];
    const obj: Record<string, string> = {};
    let any = false;
    for (let c = 0; c < headers.length; c++) {
      const v = line[c];
      const str = v === null || v === undefined ? "" : String(v).trim();
      obj[headers[c]] = str;
      if (str) any = true;
    }
    if (any) rows.push(obj);
  }

  return { headers, rows };
}
