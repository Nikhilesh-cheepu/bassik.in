export type Kiik69OptionKind = "vendor" | "payment" | "item";

export type Kiik69OptionChip = { id: string; label: string; custom: boolean };

export function kiik69Slugify(label: string): string {
  const s = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return s || "custom";
}

export function kiik69CustomId(kind: Kiik69OptionKind, slug: string): string {
  return `c_${kind}_${slug}`;
}

export function isKiik69CustomId(id: string): boolean {
  return id.startsWith("c_");
}
