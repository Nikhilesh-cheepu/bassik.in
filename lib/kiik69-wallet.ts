import type { Kiik69WalletEntry } from "@prisma/client";

export type Kiik69WalletEntryType = "deposit" | "spend";

export type Kiik69WalletEntryDto = {
  id: string;
  type: Kiik69WalletEntryType;
  amountInr: number;
  balanceAfter: number;
  note: string | null;
  entryDate: string | null;
  createdAt: string;
};

export type Kiik69WalletSummary = {
  balanceInr: number;
  totalDeposits: number;
  totalSpends: number;
  entries: Kiik69WalletEntryDto[];
};

function num(v: unknown): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v);
}

export function formatInr(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}

export function toKiik69WalletEntryDto(row: Kiik69WalletEntry): Kiik69WalletEntryDto {
  return {
    id: row.id,
    type: row.type as Kiik69WalletEntryType,
    amountInr: num(row.amountInr),
    balanceAfter: num(row.balanceAfter),
    note: row.note,
    entryDate: row.entryDate,
    createdAt: row.createdAt.toISOString(),
  };
}

export function buildWalletSummary(rows: Kiik69WalletEntry[]): Kiik69WalletSummary {
  const entries = rows.map(toKiik69WalletEntryDto).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  let totalDeposits = 0;
  let totalSpends = 0;
  for (const e of entries) {
    if (e.type === "deposit") totalDeposits += e.amountInr;
    else totalSpends += e.amountInr;
  }
  const latest = entries[0];
  const balanceInr = latest?.balanceAfter ?? 0;
  return {
    balanceInr,
    totalDeposits: Math.round(totalDeposits * 100) / 100,
    totalSpends: Math.round(totalSpends * 100) / 100,
    entries,
  };
}

export function parseWalletPayload(body: unknown): {
  type: Kiik69WalletEntryType;
  amountInr: number;
  note: string | null;
  entryDate: string | null;
} {
  const b = body as Record<string, unknown>;
  const type = b.type === "spend" ? "spend" : "deposit";
  const amountInr = num(b.amountInr);
  if (amountInr <= 0) throw new Error("Amount must be greater than 0");
  const entryDate =
    typeof b.entryDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.entryDate) ? b.entryDate : null;
  return {
    type,
    amountInr,
    note: typeof b.note === "string" && b.note.trim() ? b.note.trim() : null,
    entryDate,
  };
}
