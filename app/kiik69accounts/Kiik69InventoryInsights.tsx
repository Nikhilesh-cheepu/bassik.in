"use client";

import { useEffect, useState } from "react";
import { formatInr } from "@/lib/kiik69-stock";
import { type Kiik69StockStats } from "@/lib/kiik69-stock-stats";
import { IconSparkle } from "./Kiik69Icons";
import { kiik69FilterChip } from "./Kiik69Nav";

type QuickResult = {
  title: string;
  lines: string[];
};

export default function Kiik69InventoryInsights({
  onAskAi,
  refreshKey = 0,
  categoryFilter,
}: {
  onAskAi: (prompt: string) => void;
  refreshKey?: number;
  categoryFilter?: "food" | "liquor";
}) {
  const [stats, setStats] = useState<Kiik69StockStats | null>(null);
  const [quick, setQuick] = useState<QuickResult | null>(null);

  useEffect(() => {
    void fetch("/api/kiik69accounts/stock/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.stats) setStats(d.stats as Kiik69StockStats);
      })
      .catch(() => {});
  }, [refreshKey]);

  const alerts = stats?.alerts.filter((a) => !categoryFilter || a.category === categoryFilter) ?? [];
  const critical = alerts.filter((a) => a.severity === "critical");
  const warning = alerts.filter((a) => a.severity === "warning");

  const actions = [
    {
      id: "overview",
      label: "Overview",
      run: () => {
        if (!stats) return;
        setQuick({
          title: "Stock overview",
          lines: [
            `${formatInr(stats.totalValueInr)} on hand · ${stats.foodItems + stats.liquorItems} SKUs`,
            `Today out: ${formatInr(stats.todayStockOutCost)} · in: ${formatInr(stats.todayStockInCost)}`,
            `${stats.outOfStockCount} out · ${stats.lowStockCount} low`,
          ],
        });
      },
    },
    {
      id: "reorder",
      label: "Reorder list",
      run: () => {
        if (!stats) return;
        if (stats.alerts.length === 0) {
          setQuick({ title: "Reorder list", lines: ["All items look OK — nothing urgent."] });
          return;
        }
        setQuick({
          title: "Reorder / restock",
          lines: stats.alerts.slice(0, 6).map((a) => `${a.itemName} (${a.category}) — ${a.message}`),
        });
      },
    },
    {
      id: "ai-summary",
      label: "AI stock check",
      icon: true,
      run: () =>
        onAskAi(
          "Review our kitchen inventory — what's low or out of stock, total food vs liquor value on hand, and what we should reorder first for KIIK 69 this week."
        ),
    },
    {
      id: "ai-liquor",
      label: "Liquor usage",
      icon: true,
      run: () =>
        onAskAi(
          "Based on our liquor stock and recent stock-out, estimate how many pours/days of cover we have left on key bottles and flag anything running too low."
        ),
    },
  ];

  return (
    <div className="space-y-3">
      {stats ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-[#0e0e14] px-3 py-2.5 ring-1 ring-white/[0.06]">
            <p className="text-[10px] uppercase tracking-wide text-white/35">On hand</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-300/90">{formatInr(stats.totalValueInr)}</p>
          </div>
          <div className="rounded-2xl bg-[#0e0e14] px-3 py-2.5 ring-1 ring-orange-500/15">
            <p className="text-[10px] uppercase tracking-wide text-white/35">Used today</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-orange-300">{formatInr(stats.todayStockOutCost)}</p>
          </div>
          <div
            className={`rounded-2xl px-3 py-2.5 ring-1 ${
              alerts.length > 0 ? "bg-red-500/[0.08] ring-red-400/25" : "bg-[#0e0e14] ring-white/[0.06]"
            }`}
          >
            <p className="text-[10px] uppercase tracking-wide text-white/35">Alerts</p>
            <p className={`mt-0.5 text-sm font-semibold tabular-nums ${alerts.length > 0 ? "text-red-300" : "text-white/70"}`}>
              {alerts.length}
            </p>
          </div>
        </div>
      ) : (
        <div className="h-14 animate-pulse rounded-2xl bg-white/[0.03]" />
      )}

      {critical.length > 0 ? (
        <div className="space-y-1.5">
          {critical.slice(0, 4).map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-red-200">{a.itemName}</p>
                <p className="text-[11px] text-red-200/70">{a.message}</p>
              </div>
              <p className="shrink-0 text-[11px] font-medium text-red-200/80">{a.remainingLabel}</p>
            </div>
          ))}
        </div>
      ) : null}

      {warning.length > 0 ? (
        <div className="space-y-1.5">
          {warning.slice(0, 3).map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-100">{a.itemName}</p>
                <p className="text-[11px] text-amber-200/60">{a.message}</p>
              </div>
              <p className="shrink-0 text-[11px] font-medium text-amber-200/80">{a.remainingLabel}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="-mx-0.5 flex gap-1.5 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch]">
        {actions.map((a) => (
          <button key={a.id} type="button" onClick={a.run} className={`${kiik69FilterChip(false)} inline-flex items-center gap-1`}>
            {"icon" in a && a.icon ? <IconSparkle className="h-3 w-3 text-amber-300/80" /> : null}
            {a.label}
          </button>
        ))}
      </div>

      {quick ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2.5">
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
