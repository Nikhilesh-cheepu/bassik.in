import { prisma } from "@/lib/db";
import {
  CREDENTIAL_SEED,
  computeBudgetTotals,
  computeShootCategoryProgress,
  currentYearMonth,
} from "@/lib/tribeca";

function mapBudget(entries: { type: string; amountInr: unknown }[]) {
  return computeBudgetTotals(
    entries.map((e) => ({
      type: e.type,
      amountInr: Number(e.amountInr),
    }))
  );
}

export async function ensureTribecaMonth(yearMonth = currentYearMonth()) {
  const existing = await prisma.tribecaMonth.findUnique({
    where: { yearMonth },
    include: {
      setupItems: { orderBy: { sortOrder: "asc" } },
      calendarItems: { orderBy: [{ date: "asc" }, { createdAt: "asc" }] },
      budgetEntries: { orderBy: { createdAt: "desc" } },
    },
  });

  if (existing) {
    // Backfill credentials if an old month only had onboarding items
    const credKeys = new Set(
      existing.setupItems.filter((i) => i.groupKey === "credentials").map((i) => i.itemKey)
    );
    const missing = CREDENTIAL_SEED.filter((s) => !credKeys.has(s.itemKey));
    if (missing.length) {
      await prisma.tribecaSetupItem.createMany({
        data: missing.map((item) => ({
          monthId: existing.id,
          groupKey: "credentials",
          itemKey: item.itemKey,
          label: item.label,
          sortOrder: item.sortOrder,
        })),
      });
      return ensureTribecaMonth(yearMonth);
    }

    const credentials = existing.setupItems.filter((i) => i.groupKey === "credentials");
    return {
      month: { ...existing, setupItems: credentials },
      shootProgress: computeShootCategoryProgress(existing.calendarItems),
      budget: mapBudget(existing.budgetEntries),
    };
  }

  const month = await prisma.tribecaMonth.create({
    data: {
      yearMonth,
      setupItems: {
        create: CREDENTIAL_SEED.map((item) => ({
          groupKey: "credentials",
          itemKey: item.itemKey,
          label: item.label,
          sortOrder: item.sortOrder,
        })),
      },
    },
    include: {
      setupItems: { orderBy: { sortOrder: "asc" } },
      calendarItems: { orderBy: [{ date: "asc" }, { createdAt: "asc" }] },
      budgetEntries: { orderBy: { createdAt: "desc" } },
    },
  });

  return {
    month,
    shootProgress: computeShootCategoryProgress(month.calendarItems),
    budget: mapBudget(month.budgetEntries),
  };
}

export async function listTribecaYearMonths() {
  const rows = await prisma.tribecaMonth.findMany({
    select: { yearMonth: true },
    orderBy: { yearMonth: "asc" },
  });
  return rows.map((r) => r.yearMonth);
}
