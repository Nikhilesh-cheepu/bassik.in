"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { BRANDS } from "@/lib/brands";

type AdminMe = { scope: "main" | "outlet"; brandIds: string[] | null };

type ReviewRow = {
  id: string;
  brandId: string;
  outletName: string;
  author: string;
  rating: number;
  reviewText: string;
  source: "ai" | "user";
  approved?: boolean;
  createdAt: string;
};

export default function ReviewsPageClient() {
  const [adminMe, setAdminMe] = useState<AdminMe | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandFilter, setBrandFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "user" | "ai">("user");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, listRes] = await Promise.all([
        fetch("/api/admin/me", { cache: "no-store" }),
        fetch("/api/admin/reviews", { cache: "no-store" }),
      ]);
      if (meRes.ok) setAdminMe(await meRes.json());
      if (listRes.ok) {
        const d = await listRes.json();
        setRows(Array.isArray(d.reviews) ? d.reviews : []);
      } else {
        setRows([]);
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const allowedBrands = useMemo(() => {
    if (!adminMe || adminMe.scope === "main" || !adminMe.brandIds?.length) return BRANDS;
    const s = new Set(adminMe.brandIds);
    return BRANDS.filter((b) => s.has(b.id));
  }, [adminMe]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (brandFilter !== "all" && r.brandId !== brandFilter) return false;
      if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
      return true;
    });
  }, [rows, brandFilter, sourceFilter]);

  async function approve(row: ReviewRow) {
    const res = await fetch("/api/admin/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, brandId: row.brandId }),
    });
    if (res.ok) setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, approved: true } : r)));
  }

  async function remove(row: ReviewRow) {
    const ok = window.confirm("Delete this review?");
    if (!ok) return;
    const res = await fetch("/api/admin/reviews", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, brandId: row.brandId }),
    });
    if (res.ok) setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  return (
    <AdminShell title="Reviews">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-2 sm:gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Outlet</label>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">All outlets</option>
              {allowedBrands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.shortName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Source</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as "all" | "user" | "ai")}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="user">User</option>
              <option value="all">All</option>
              <option value="ai">AI</option>
            </select>
          </div>
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading reviews...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No reviews found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((r) => (
              <div key={r.id} className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{r.author}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {r.outletName}
                      </span>
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        {Math.round(r.rating * 10) / 10}★
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                        {r.source.toUpperCase()}
                      </span>
                      {r.source === "user" && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            r.approved ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
                          }`}
                        >
                          {r.approved ? "APPROVED" : "PENDING"}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-slate-700 leading-relaxed">{r.reviewText}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.source === "user" && !r.approved && (
                      <button
                        type="button"
                        onClick={() => approve(r)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                    )}
                    {r.source === "user" && (
                      <button
                        type="button"
                        onClick={() => remove(r)}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
