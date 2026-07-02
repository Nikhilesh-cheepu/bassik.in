"use client";

import { useCallback, useEffect, useState } from "react";
import {
  KICK69_PAYMENT_METHODS,
  KICK69_PURCHASE_VENDORS,
  kick69PaymentLabel,
  kick69VendorLabel,
  type Kick69PurchaseDto,
} from "@/lib/kick69-accounts";
import { TeamDatePicker } from "@/app/team/TeamDatePicker";

type PurchaseForm = {
  vendor: string;
  paymentMethod: string;
  amount: string;
  purchaseDate: string;
  title: string;
  description: string;
  aiSummary: string;
  billUrl: string;
  billFileName: string;
  purchaseLink: string;
};

const emptyForm = (): PurchaseForm => ({
  vendor: "",
  paymentMethod: "",
  amount: "",
  purchaseDate: "",
  title: "",
  description: "",
  aiSummary: "",
  billUrl: "",
  billFileName: "",
  purchaseLink: "",
});

function formatInr(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function Kick69PurchasesView() {
  const [purchases, setPurchases] = useState<Kick69PurchaseDto[]>([]);
  const [ready, setReady] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PurchaseForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/kick69/purchases");
    const data = await res.json();
    if (res.ok) {
      setPurchases(data.purchases ?? []);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
    setError(null);
  };

  const openEdit = (p: Kick69PurchaseDto) => {
    setEditingId(p.id);
    setForm({
      vendor: p.vendor,
      paymentMethod: p.paymentMethod,
      amount: p.amount != null ? String(p.amount) : "",
      purchaseDate: p.purchaseDate ?? "",
      title: p.title ?? "",
      description: p.description ?? "",
      aiSummary: p.aiSummary ?? "",
      billUrl: p.billUrl ?? "",
      billFileName: p.billFileName ?? "",
      purchaseLink: p.purchaseLink ?? "",
    });
    setShowForm(true);
    setError(null);
  };

  const uploadBill = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "bill");
      const res = await fetch("/api/kick69/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setForm((f) => ({
        ...f,
        billUrl: data.url,
        billFileName: data.fileName ?? file.name,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const runAiScan = async () => {
    if (!form.billUrl) {
      setError("Upload a bill image first");
      return;
    }
    setScanning(true);
    setError(null);
    try {
      const res = await fetch("/api/kick69/purchases/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: form.billUrl,
          vendor: form.vendor || undefined,
          paymentMethod: form.paymentMethod || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI scan failed");
      setForm((f) => ({
        ...f,
        title: data.title || f.title,
        amount: data.amount != null ? String(data.amount) : f.amount,
        purchaseDate: data.purchaseDate || f.purchaseDate,
        aiSummary: data.aiSummary || f.aiSummary,
        vendor: data.vendor || f.vendor,
        paymentMethod: data.paymentMethod || f.paymentMethod,
        description: f.description.trim()
          ? f.description
          : data.aiSummary || f.description,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI scan failed");
    } finally {
      setScanning(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        vendor: form.vendor,
        paymentMethod: form.paymentMethod,
        amount: form.amount.trim() ? Number(form.amount) : null,
        purchaseDate: form.purchaseDate || null,
        title: form.title.trim() || null,
        description: form.description.trim() || null,
        aiSummary: form.aiSummary.trim() || null,
        billUrl: form.billUrl || null,
        billFileName: form.billFileName || null,
        purchaseLink: form.purchaseLink.trim() || null,
      };
      const url = editingId ? `/api/kick69/purchases/${editingId}` : "/api/kick69/purchases";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this purchase?")) return;
    await fetch(`/api/kick69/purchases/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-white">Purchases</h2>
          <p className="text-xs text-white/40">Zepto, Instamart, Blinkit & more — bill + AI</p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-sm font-semibold"
        >
          + Add
        </button>
      </div>

      {error && !showForm ? (
        <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
      ) : null}

      {!ready ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      ) : purchases.length === 0 ? (
        <p className="py-12 text-center text-sm text-white/35">No purchases yet — tap Add to log one.</p>
      ) : (
        <ul className="space-y-2">
          {purchases.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-white/[0.06] bg-[#0e0e14] px-3.5 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <button type="button" onClick={() => openEdit(p)} className="min-w-0 flex-1 text-left">
                  <p className="font-medium text-white/92">{p.title || kick69VendorLabel(p.vendor)}</p>
                  <p className="mt-0.5 text-xs text-white/40">
                    {kick69VendorLabel(p.vendor)} · {kick69PaymentLabel(p.paymentMethod)} · {formatInr(p.amount)}
                  </p>
                  {p.aiSummary ? (
                    <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-white/35">{p.aiSummary}</p>
                  ) : null}
                </button>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {p.billUrl ? (
                    <a
                      href={p.billUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-cyan-400/90"
                    >
                      Bill
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void remove(p.id)}
                    className="text-[11px] text-red-300/60"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 sm:items-center sm:justify-center sm:p-6">
          <form
            onSubmit={save}
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0c0c12] p-4 sm:max-w-lg sm:rounded-2xl"
          >
            <h3 className="text-lg font-semibold">{editingId ? "Edit purchase" : "New purchase"}</h3>

            <label className="mt-4 block text-xs font-medium text-white/50">Vendor</label>
            <select
              required
              value={form.vendor}
              onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
            >
              <option value="">Select vendor</option>
              {KICK69_PURCHASE_VENDORS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>

            <label className="mt-3 block text-xs font-medium text-white/50">Payment</label>
            <select
              required
              value={form.paymentMethod}
              onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
            >
              <option value="">Select payment</option>
              {KICK69_PAYMENT_METHODS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>

            <label className="mt-3 block text-xs font-medium text-white/50">Bill / invoice</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              disabled={uploading}
              className="mt-1 block w-full text-sm text-white/60"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadBill(file);
                e.target.value = "";
              }}
            />
            {uploading ? <p className="mt-1 text-xs text-cyan-200">Uploading…</p> : null}
            {form.billFileName ? (
              <p className="mt-1 text-xs text-emerald-300">✓ {form.billFileName}</p>
            ) : null}
            {form.billUrl ? (
              <button
                type="button"
                disabled={scanning}
                onClick={() => void runAiScan()}
                className="mt-2 rounded-lg bg-violet-500/15 px-3 py-2 text-xs font-medium text-violet-200 ring-1 ring-violet-400/20 disabled:opacity-50"
              >
                {scanning ? "AI reading bill…" : "Scan bill with AI"}
              </button>
            ) : null}

            <label className="mt-3 block text-xs font-medium text-white/50">Purchase link (optional)</label>
            <input
              value={form.purchaseLink}
              onChange={(e) => setForm((f) => ({ ...f, purchaseLink: e.target.value }))}
              placeholder="Order link from app"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
            />

            <label className="mt-3 block text-xs font-medium text-white/50">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="What you bought"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
            />

            <label className="mt-3 block text-xs font-medium text-white/50">Amount (₹)</label>
            <input
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
            />

            <label className="mt-3 block text-xs font-medium text-white/50">Purchase date</label>
            <div className="mt-1">
              <TeamDatePicker
                value={form.purchaseDate}
                onChange={(v) => setForm((f) => ({ ...f, purchaseDate: v }))}
                placeholder="Select date"
                clearable
              />
            </div>

            <label className="mt-3 block text-xs font-medium text-white/50">Notes</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
            />

            {form.aiSummary ? (
              <div className="mt-3 rounded-xl border border-violet-400/15 bg-violet-500/5 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-violet-200/70">AI summary</p>
                <p className="mt-1 text-xs leading-relaxed text-white/50">{form.aiSummary}</p>
              </div>
            ) : null}

            {error ? (
              <p className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="min-h-[48px] flex-1 rounded-xl border border-white/10 text-sm text-white/60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploading || scanning}
                className="min-h-[48px] flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-sm font-semibold disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
