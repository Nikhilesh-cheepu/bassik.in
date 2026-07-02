import { prisma } from "@/lib/db";
import {
  kiik69CustomId,
  kiik69Slugify,
  type Kiik69OptionKind,
} from "@/lib/kiik69-custom-options";

export async function listKiik69CustomOptions(kind?: Kiik69OptionKind) {
  const rows = await prisma.kiik69CustomOption.findMany({
    where: kind ? { kind } : undefined,
    orderBy: { label: "asc" },
  });
  return rows.map((r) => ({
    id: kiik69CustomId(r.kind as Kiik69OptionKind, r.slug),
    label: r.label,
    kind: r.kind as Kiik69OptionKind,
    custom: true as const,
  }));
}

export async function upsertKiik69CustomOption(kind: Kiik69OptionKind, label: string) {
  const trimmed = label.trim().slice(0, 120);
  if (!trimmed) return null;
  const slug = kiik69Slugify(trimmed);
  const row = await prisma.kiik69CustomOption.upsert({
    where: { kind_label: { kind, label: trimmed } },
    create: { kind, slug, label: trimmed },
    update: { slug },
  });
  return {
    id: kiik69CustomId(kind, row.slug),
    label: row.label,
  };
}

export async function upsertKiik69CustomOptionsFromPurchase(input: {
  vendor: string;
  vendorLabel: string | null;
  paymentMethod: string;
  paymentLabel: string | null;
  item: string | null;
  itemLabel: string | null;
}) {
  const tasks: Promise<unknown>[] = [];
  if (input.vendorLabel?.trim()) {
    tasks.push(upsertKiik69CustomOption("vendor", input.vendorLabel));
  }
  if (input.paymentLabel?.trim()) {
    tasks.push(upsertKiik69CustomOption("payment", input.paymentLabel));
  }
  if (input.itemLabel?.trim()) {
    tasks.push(upsertKiik69CustomOption("item", input.itemLabel));
  }
  await Promise.all(tasks);
}
