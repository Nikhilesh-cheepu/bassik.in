import OpenAI from "openai";
import type { ColumnMapping, AutomationColumnTarget } from "./types";

const VALID: AutomationColumnTarget[] = ["fullName", "phone", "venue", "extra", "ignore"];

function coerceMapping(raw: unknown, headers: string[]): ColumnMapping[] {
  if (!raw || typeof raw !== "object") return defaultMapping(headers);
  const arr = (raw as { mappings?: unknown }).mappings;
  if (!Array.isArray(arr)) return defaultMapping(headers);

  const headerSet = new Set(headers);
  const out: ColumnMapping[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const sourceColumn = String(o.sourceColumn ?? "").trim();
    if (!headerSet.has(sourceColumn)) continue;
    const target = String(o.target ?? "ignore") as AutomationColumnTarget;
    const t = VALID.includes(target) ? target : "ignore";
    const extraKey =
      typeof o.extraKey === "string" && o.extraKey.trim() ? o.extraKey.trim() : undefined;
    out.push({
      sourceColumn,
      target: t,
      extraKey: t === "extra" ? extraKey || undefined : undefined,
    });
  }

  for (const h of headers) {
    if (!out.some((m) => m.sourceColumn === h)) {
      out.push({ sourceColumn: h, target: "ignore" });
    }
  }
  return out.sort((a, b) => headers.indexOf(a.sourceColumn) - headers.indexOf(b.sourceColumn));
}

export function defaultMapping(headers: string[]): ColumnMapping[] {
  return headers.map((h) => {
    const l = h.toLowerCase();
    if (/phone|mobile|contact|whatsapp|tel|cell/.test(l)) {
      return { sourceColumn: h, target: "phone" as const };
    }
    if (/name|guest|customer|full/.test(l) && !/venue|location/.test(l)) {
      return { sourceColumn: h, target: "fullName" as const };
    }
    if (/venue|location|outlet|club|branch/.test(l)) {
      return { sourceColumn: h, target: "venue" as const };
    }
    if (/date|day|visit|walkin|walking|booking|guest list/i.test(l)) {
      return {
        sourceColumn: h,
        target: "extra" as const,
        extraKey: l.replace(/\s+/g, "_").slice(0, 48),
      };
    }
    if (/age|gender|sex|note|remark|email|city/.test(l)) {
      return {
        sourceColumn: h,
        target: "extra" as const,
        extraKey: l.replace(/\s+/g, "_").slice(0, 48),
      };
    }
    return { sourceColumn: h, target: "ignore" as const };
  });
}

export async function suggestColumnMappingWithOpenAI(
  headers: string[],
  sampleRows: Record<string, string>[]
): Promise<ColumnMapping[]> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return defaultMapping(headers);
  }

  const client = new OpenAI({ apiKey: key });
  const userPayload = {
    headers,
    sampleRows: sampleRows.slice(0, 8),
    instructions:
      "Map each header to one target: fullName, phone, venue, extra, or ignore. " +
      "Use extra for age, gender, notes, email, or any column that is not name/phone/venue. " +
      "For extra, set extraKey to a short snake_case key derived from the header. " +
      "Exactly one column should map to phone when possible (pick the best phone-like column). " +
      "sourceColumn must match a header string exactly.",
  };

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You help map messy spreadsheet columns to structured fields. " +
            'Reply with JSON: { "mappings": [ { "sourceColumn": string, "target": "fullName"|"phone"|"venue"|"extra"|"ignore", "extraKey"?: string } ] }. ' +
            "Include every header exactly once in mappings.",
        },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      temperature: 0.2,
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) return defaultMapping(headers);
    const parsed = JSON.parse(text) as unknown;
    return coerceMapping(parsed, headers);
  } catch {
    return defaultMapping(headers);
  }
}
