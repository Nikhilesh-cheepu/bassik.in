"use client";

import { useEffect, useState } from "react";
import { formatInr, type Kiik69PurchaseStats } from "@/lib/kiik69-purchase-stats";
import { kiik69FilterChip } from "./Kiik69Nav";

type QuickResult = {
  title: string;
  lines: string[];
};

type Props = {
  onAskAi: (prompt: string) => void;
};

export default function Kiik69PurchaseInsights({ onAskAi, refreshKey = 0 }: Props & { refreshKey?: number }) {
  const [stats, setStats] = useState<Kiik69PurchaseStats | null>(null);
  const [quick, setQuick] = useState<QuickResult | null>(null);

  useEffect(() => {
    void fetch("/api/kiik69accounts/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.stats) setStats(d.stats as Kiik69PurchaseStats);
      })
      .catch(() => {});
  }, [refreshKey]);

  const actions: { id: string; label: string; run: () => void }[] = [
    {
      id: "month",
      label: "This month",
      run: () => {
        if (!stats) return;
        setQuick({
          title: "This month",
          lines: [
            `${formatInr(stats.thisMonthTotal)} across ${stats.thisMonthCount} purchases`,
            `Last 7 days: ${formatInr(stats.last7DaysTotal)}`,
          ],
        });
      },
    },
    {
      id: "top-vendor",
      label: "Top vendor",
      run: () => {
        const top = stats?.byVendor[0];
        if (!top) {
          setQuick({ title: "Top vendor", lines: ["No purchases logged yet."] });
          return;
        }
        setQuick({
          title: "Top vendor",
          lines: [`${top.label}: ${formatInr(top.total)} (${top.count} bills)`],
        });
      },
    },
    {
      id: "ai-summary",
      label: "AI summary",
      run: () => onAskAi("Give me a short accountant summary of our kitchen spending this month — top vendors, anything unusual, and what to watch."),
    },
    {
      id: "ai-mixed",
      label: "Mixed bill help",
      run: () =>
        onAskAi(
          "I have a bill with groceries, bottles, and cleaning supplies on one invoice. How should I log it in KIIK 69 accounts?"
        ),
    },
  ];

  return (
    <div className="mb-4 space-y-3">
      {stats ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-[#0e0e14] px-3 py-2.5 ring-1 ring-white/[0.06]">
            <p className="text-[10px] uppercase tracking-wide text-white/35">This month</p>
            <p className="mt-0.5 text-sm font-semibold text-amber-200/90">{formatInr(stats.thisMonthTotal)}</p>
          </div>
          <div className="rounded-xl bg-[#0e0e14] px-3 py-2.5 ring-1 ring-white/[0.06]">
            <p className="text-[10px] uppercase tracking-wide text-white/35">Bills</p>
            <p className="mt-0.5 text-sm font-semibold text-white/90">{stats.thisMonthCount}</p>
          </div>
          <div className="rounded-xl bg-[#0e0e14] px-3 py-2.5 ring-1 ring-white/[0.06]">
            <p className="text-[10px] uppercase tracking-wide text-white/35">7 days</p>
            <p className="mt-0.5 text-sm font-semibold text-white/90">{formatInr(stats.last7DaysTotal)}</p>
          </div>
        </div>
      ) : (
        <div className="h-16 animate-pulse rounded-xl bg-white/[0.03]" />
      )}

      <div className="-mx-0.5 flex gap-1.5 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch]">
        {actions.map((a) => (
          <button key={a.id} type="button" onClick={a.run} className={kiik69FilterChip(false)}>
            {a.label}
          </button>
        ))}
      </div>

      {quick ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300/80">{quick.title}</p>
          {quick.lines.map((line) => (
            <p key={line} className="mt-1 text-sm text-white/80">
              {line}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
