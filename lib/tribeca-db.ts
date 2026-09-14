import { prisma } from "@/lib/db";
import {
  ACCESS_CREDENTIAL_KEYS,
  CREDENTIAL_SEED,
  computeBudgetTotals,
  computeShootCategoryProgress,
  currentYearMonth,
  normalizeCredentialStatus,
} from "@/lib/tribeca";

function mapBudget(entries: { type: string; amountInr: unknown }[]) {
  return computeBudgetTotals(
    entries.map((e) => ({
      type: e.type,
      amountInr: Number(e.amountInr),
    }))
  );
}

function filterCredentials<T extends { itemKey: string; status: string }>(items: T[]) {
  const wanted = new Set<string>(CREDENTIAL_SEED.map((s) => s.itemKey));
  return items
    .filter((i) => wanted.has(i.itemKey))
    .map((i) => ({
      ...i,
      status: ACCESS_CREDENTIAL_KEYS.has(i.itemKey)
        ? normalizeCredentialStatus(i.status)
        : i.status === "done"
          ? "done"
          : "pending",
    }));
}

const monthInclude = {
  setupItems: { orderBy: { sortOrder: "asc" as const } },
  calendarItems: { orderBy: [{ date: "asc" as const }, { createdAt: "asc" as const }] },
  budgetEntries: { orderBy: { createdAt: "desc" as const } },
};

/** Fast path for writes — only needs month id, no heavy includes / sync. */
export async function ensureTribecaMonthId(yearMonth: string): Promise<string> {
  const existing = await prisma.tribecaMonth.findUnique({
    where: { yearMonth },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.tribecaMonth.create({
    data: {
      yearMonth,
      setupItems: {
        create: CREDENTIAL_SEED.map((item) => ({
          groupKey: "credentials",
          itemKey: item.itemKey,
          label: item.label,
          status: "pending",
          sortOrder: item.sortOrder,
        })),
      },
    },
    select: { id: true },
  });
  return created.id;
}

export async function ensureTribecaMonth(yearMonth = currentYearMonth()) {
  const existing = await prisma.tribecaMonth.findUnique({
    where: { yearMonth },
    include: monthInclude,
  });

  if (existing) {
    const byKey = new Map(existing.setupItems.map((i) => [i.itemKey, i]));
    const missing = CREDENTIAL_SEED.filter((s) => !byKey.has(s.itemKey));

    // Only create missing credential rows — skip label/status rewrites on every load
    if (missing.length) {
      await prisma.tribecaSetupItem.createMany({
        data: missing.map((item) => ({
          monthId: existing.id,
          groupKey: "credentials",
          itemKey: item.itemKey,
          label: item.label,
          status: "pending",
          sortOrder: item.sortOrder,
        })),
      });
      const refreshed = await prisma.tribecaMonth.findUniqueOrThrow({
        where: { id: existing.id },
        include: monthInclude,
      });
      return {
        month: { ...refreshed, setupItems: filterCredentials(refreshed.setupItems) },
        shootProgress: computeShootCategoryProgress(refreshed.calendarItems),
        budget: mapBudget(refreshed.budgetEntries),
      };
    }

    return {
      month: { ...existing, setupItems: filterCredentials(existing.setupItems) },
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
          status: "pending",
          sortOrder: item.sortOrder,
        })),
      },
    },
    include: monthInclude,
  });

  return {
    month,
    shootProgress: computeShootCategoryProgress(month.calendarItems),
    budget: mapBudget(month.budgetEntries),
  };
}

export async function listTribecaCalendarInRange(fromDate: string, toDate: string) {
  return prisma.tribecaCalendarItem.findMany({
    where: { date: { gte: fromDate, lte: toDate } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      date: true,
      kind: true,
      title: true,
      category: true,
      stage: true,
      notes: true,
    },
  });
}

export async function listTribecaYearMonths() {
  const rows = await prisma.tribecaMonth.findMany({
    select: { yearMonth: true },
    orderBy: { yearMonth: "asc" },
  });
  return rows.map((r) => r.yearMonth);
}
