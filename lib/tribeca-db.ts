import { prisma } from "@/lib/db";
import {
  CAMPAIGN_SEED,
  CHANNEL_SEED,
  SETUP_SEED,
  computePhaseProgress,
  currentYearMonth,
} from "@/lib/tribeca";

export async function ensureTribecaMonth(yearMonth = currentYearMonth()) {
  const existing = await prisma.tribecaMonth.findUnique({
    where: { yearMonth },
    include: {
      setupItems: { orderBy: { sortOrder: "asc" } },
      channels: { orderBy: { sortOrder: "asc" } },
      campaigns: { orderBy: { sortOrder: "asc" } },
      events: { orderBy: [{ eventDate: "asc" }, { createdAt: "asc" }] },
      requests: { orderBy: { createdAt: "desc" } },
    },
  });
  if (existing) {
    const progress = computePhaseProgress(existing);
    return { month: existing, progress };
  }

  const month = await prisma.tribecaMonth.create({
    data: {
      yearMonth,
      setupItems: {
        create: SETUP_SEED.map((item) => ({
          groupKey: item.groupKey,
          itemKey: item.itemKey,
          label: item.label,
          sortOrder: item.sortOrder,
        })),
      },
      channels: {
        create: CHANNEL_SEED.map((c) => ({
          platform: c.platform,
          label: c.label,
          sortOrder: c.sortOrder,
        })),
      },
      campaigns: {
        create: CAMPAIGN_SEED.map((c) => ({
          type: c.type,
          label: c.label,
          sortOrder: c.sortOrder,
        })),
      },
    },
    include: {
      setupItems: { orderBy: { sortOrder: "asc" } },
      channels: { orderBy: { sortOrder: "asc" } },
      campaigns: { orderBy: { sortOrder: "asc" } },
      events: { orderBy: [{ eventDate: "asc" }, { createdAt: "asc" }] },
      requests: { orderBy: { createdAt: "desc" } },
    },
  });

  return { month, progress: computePhaseProgress(month) };
}

export async function listTribecaYearMonths() {
  const rows = await prisma.tribecaMonth.findMany({
    select: { yearMonth: true },
    orderBy: { yearMonth: "asc" },
  });
  return rows.map((r) => r.yearMonth);
}
