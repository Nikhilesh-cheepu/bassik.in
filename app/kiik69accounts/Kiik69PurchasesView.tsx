"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Kiik69OptionChip } from "@/lib/kiik69-custom-options";
import {
  KIIK69_PAYMENT_METHODS,
  KIIK69_PURCHASE_ITEMS,
  KIIK69_PURCHASE_VENDORS,
  kiik69ItemLabel,
  kiik69OutletLabel,
  kiik69PaymentLabel,
  kiik69VendorLabel,
  mergeKiik69OptionChips,
  type Kiik69PurchaseDto,
} from "@/lib/kiik69-accounts";
import { newKiik69AttachmentId, type Kiik69PurchaseAttachment } from "@/lib/kiik69-purchase-attachments";
import { formatKiik69Timestamp } from "@/lib/kiik69-datetime";
import Kiik69PurchaseDetail from "./Kiik69PurchaseDetail";
import Kiik69PurchaseForm, { type PurchaseFormData } from "./Kiik69PurchaseForm";
import Kiik69PurchaseInsights from "./Kiik69PurchaseInsights";
import { useKiik69BodyScrollLock } from "./Kiik69Nav";

const DEFAULT_VENDOR_CHIPS = mergeKiik69OptionChips(KIIK69_PURCHASE_VENDORS, []);
const DEFAULT_PAYMENT_CHIPS = mergeKiik69OptionChips(KIIK69_PAYMENT_METHODS, []);
const DEFAULT_ITEM_CHIPS = mergeKiik69OptionChips(KIIK69_PURCHASE_ITEMS, []);

const emptyForm = (): PurchaseFormData => ({
  outlet: "",
  outletOther: "",
  vendor: "",
  vendorOther: "",
  paymentMethod: "",
  paymentOther: "",
  item: "",
  itemOther: "",
  amount: "",
  purchaseDate: "",
  title: "",
  description: "",
  aiSummary: "",
  attachments: [],
  purchaseLink: "",
});

function formatInr(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function dateGroupKey(ymd: string | null): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "Earlier";
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  const yesterdayKey = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
  if (ymd === todayKey) return "Today";
  if (ymd === yesterdayKey) return "Yesterday";
  return new Date(ymd + "T12:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function purchaseToForm(p: Kiik69PurchaseDto): PurchaseFormData {
  return {
    outlet: p.outlet ?? "",
    outletOther: p.outlet === "other" ? (p.outletLabel ?? "") : "",
    vendor: p.vendor,
    vendorOther: p.vendorLabel ?? "",
    paymentMethod: p.paymentMethod,
    paymentOther: p.paymentLabel ?? "",
    item: p.item ?? "",
    itemOther: p.itemLabel ?? "",
    amount: p.amount != null ? String(p.amount) : "",
    purchaseDate: p.purchaseDate ?? "",
    title: p.title ?? "",
    description: p.description ?? "",
    aiSummary: p.aiSummary ?? "",
    attachments: p.attachments.map((a) => ({ ...a })),
    purchaseLink: p.purchaseLink ?? "",
  };
}

type AiScanResult = {
  title?: string;
  amount?: number | null;
  billTotal?: number | null;
  amountPaid?: number | null;
  purchaseDate?: string | null;
  aiSummary?: string;
  notes?: string;
  description?: string;
  vendor?: string;
  paymentMethod?: string;
  item?: string;
  itemOther?: string;
  transactionIds?: string[];
};

function mergeAiIntoForm(prev: PurchaseFormData, data: AiScanResult): PurchaseFormData {
  const bestAmount = data.amountPaid ?? data.billTotal ?? data.amount;
  return {
    ...prev,
    title: data.title || prev.title,
    amount: bestAmount != null ? String(bestAmount) : prev.amount,
    purchaseDate: data.purchaseDate || prev.purchaseDate,
    aiSummary: [prev.aiSummary, data.aiSummary || data.notes].filter(Boolean).join("\n\n").trim(),
    vendor: data.vendor || prev.vendor,
    paymentMethod: data.paymentMethod || prev.paymentMethod,
    item: data.item || prev.item,
    itemOther: data.itemOther || prev.itemOther,
    description: data.description || data.notes || prev.description || data.aiSummary || prev.aiSummary,
  };
}

export default function Kiik69PurchasesView({
  addSignal = 0,
  onAskAi,
}: {
  addSignal?: number;
  onAskAi?: (prompt: string) => void;
}) {
  const [purchases, setPurchases] = useState<Kiik69PurchaseDto[]>([]);
  const [ready, setReady] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PurchaseFormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Kiik69PurchaseDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendorChips, setVendorChips] = useState<Kiik69OptionChip[]>(DEFAULT_VENDOR_CHIPS);
  const [paymentChips, setPaymentChips] = useState<Kiik69OptionChip[]>(DEFAULT_PAYMENT_CHIPS);
  const [itemChips, setItemChips] = useState<Kiik69OptionChip[]>(DEFAULT_ITEM_CHIPS);

  const loadOptions = useCallback(async () => {
    const res = await fetch("/api/kiik69accounts/options");
    const data = await res.json();
    if (res.ok) {
      setVendorChips(data.vendors ?? DEFAULT_VENDOR_CHIPS);
      setPaymentChips(data.payments ?? DEFAULT_PAYMENT_CHIPS);
      setItemChips(data.items ?? DEFAULT_ITEM_CHIPS);
    }
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/kiik69accounts/purchases");
    const data = await res.json();
    if (res.ok) {
      setPurchases(data.purchases ?? []);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadOptions();
  }, [load, loadOptions]);

  useEffect(() => {
    if (addSignal > 0) openNew();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSignal]);

  useKiik69BodyScrollLock(showForm || detail !== null);

  const grouped = useMemo(() => {
    const map = new Map<string, Kiik69PurchaseDto[]>();
    for (const p of purchases) {
      const key = dateGroupKey(p.purchaseDate);
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    const order = ["Today", "Yesterday"];
    return [...map.entries()].sort((a, b) => {
      const ai = order.indexOf(a[0]);
      const bi = order.indexOf(b[0]);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return 0;
    });
  }, [purchases]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
    setError(null);
    void loadOptions();
  };

  const openEdit = (p: Kiik69PurchaseDto) => {
    setDetail(null);
    setEditingId(p.id);
    setForm(purchaseToForm(p));
    setShowForm(true);
    setError(null);
    void loadOptions();
  };

  const scanDocument = async (
    attachment: Kiik69PurchaseAttachment,
    ctx: PurchaseFormData
  ): Promise<AiScanResult | null> => {
    const docCategory =
      attachment.docType === "payment"
        ? "payment"
        : attachment.docType === "invoice"
          ? "invoice"
          : attachment.docType === "bill"
            ? "bill"
            : undefined;
    const res = await fetch("/api/kiik69accounts/purchases/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentUrl: attachment.url,
        mimeType: attachment.mimeType || undefined,
        docCategory,
        vendor: ctx.vendor || undefined,
        paymentMethod: ctx.paymentMethod || undefined,
        item: ctx.item || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "AI scan failed");
    return data as AiScanResult;
  };

  const applyScanResult = (
    prev: PurchaseFormData,
    att: Kiik69PurchaseAttachment,
    data: AiScanResult
  ): PurchaseFormData => {
    const note = data.aiSummary || data.notes || "";
    const withNote: PurchaseFormData = {
      ...prev,
      attachments: prev.attachments.map((a) =>
        a.id === att.id
          ? {
              ...a,
              aiNote: note || a.aiNote,
              transactionIds: data.transactionIds?.length ? data.transactionIds : a.transactionIds,
              amountPaid: data.amountPaid ?? a.amountPaid,
              billTotal: data.billTotal ?? a.billTotal,
            }
          : a
      ),
    };
    return mergeAiIntoForm(withNote, data);
  };

  const runAiOnAttachments = async (ctx: PurchaseFormData) => {
    const scannable = ctx.attachments.filter(
      (a) =>
        !a.aiNote &&
        (a.mimeType.startsWith("image/") || a.mimeType === "application/pdf" || a.url.includes(".pdf"))
    );
    if (scannable.length === 0) return;

    setScanning(true);
    setError(null);
    try {
      let merged = { ...ctx };
      for (const att of scannable) {
        try {
          const data = await scanDocument(att, merged);
          if (data) merged = applyScanResult(merged, att, data);
        } catch {
          // other files may still work
        }
      }
      setForm(syncAiSummaryFromAttachments(merged));
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI scan failed");
    } finally {
      setScanning(false);
    }
  };

  const syncAiSummaryFromAttachments = (ctx: PurchaseFormData): PurchaseFormData => {
    if (ctx.aiSummary?.trim()) return ctx;
    const combined = ctx.attachments
      .filter((a) => a.aiNote?.trim())
      .map((a) => `${a.fileName}: ${a.aiNote}`)
      .join("\n\n");
    return combined ? { ...ctx, aiSummary: combined } : ctx;
  };

  const uploadSingleFile = async (file: File): Promise<Kiik69PurchaseAttachment> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", "files");
    const res = await fetch("/api/kiik69accounts/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return {
      id: newKiik69AttachmentId(),
      url: data.url,
      fileName: data.fileName ?? file.name,
      mimeType: data.mimeType ?? "",
      docType: "",
    };
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: Kiik69PurchaseAttachment[] = [];
      for (const file of list) {
        uploaded.push(await uploadSingleFile(file));
      }
      const nextCtx: PurchaseFormData = {
        ...form,
        attachments: [...form.attachments, ...uploaded],
      };
      setForm(nextCtx);
      setUploading(false);
      await runAiOnAttachments(nextCtx);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setUploading(false);
    }
  };

  const enterReview = async (ctx: PurchaseFormData) => {
    await runAiOnAttachments(ctx);
    setForm((f) => syncAiSummaryFromAttachments(f));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        outlet: form.outlet,
        outletOther: form.outletOther.trim() || null,
        vendor: form.vendor,
        vendorOther: form.vendorOther.trim() || null,
        paymentMethod: form.paymentMethod,
        paymentOther: form.paymentOther.trim() || null,
        item: form.item,
        itemOther: form.itemOther.trim() || null,
        amount: form.amount.trim() ? Number(form.amount) : null,
        purchaseDate: form.purchaseDate || null,
        title: form.title.trim() || null,
        description: form.description.trim() || null,
        aiSummary: form.aiSummary.trim() || null,
        attachments: form.attachments,
        purchaseLink: form.purchaseLink.trim() || null,
      };
      const url = editingId
        ? `/api/kiik69accounts/purchases/${editingId}`
        : "/api/kiik69accounts/purchases";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setShowForm(false);
      setEditingId(null);
      await Promise.all([load(), loadOptions()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string, deletePassword: string) => {
    const res = await fetch(`/api/kiik69accounts/purchases/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deletePassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Delete failed");
    setDetail(null);
    await load();
  };

  return (
    <>
      {onAskAi ? <Kiik69PurchaseInsights onAskAi={onAskAi} refreshKey={purchases.length} /> : null}

      {error && !showForm ? (
        <p className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {!ready ? (
        <div className="space-y-3 py-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]"
            />
          ))}
        </div>
      ) : purchases.length === 0 ? (
        <p className="py-16 text-center text-sm text-white/40">No purchases yet — tap + to log one.</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(([label, items]) => (
            <section key={label}>
              <h3 className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-white/30">
                {label}
              </h3>
              <ul className="space-y-2">
                {items.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setDetail(p)}
                      className="relative w-full overflow-hidden rounded-xl bg-[#0e0e14] py-3 pl-3.5 pr-3 text-left ring-1 ring-white/[0.06] active:bg-white/[0.03]"
                    >
                      <div className="absolute inset-y-0 left-0 w-1 bg-amber-500/80" />
                      <div className="flex items-start justify-between gap-3 pl-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-white/92">
                            {p.title || kiik69ItemLabel(p.item, p.itemLabel)}
                          </p>
                          <p className="mt-0.5 text-xs text-white/40">
                            {kiik69OutletLabel(p.outlet, p.outletLabel)} ·{" "}
                            {kiik69VendorLabel(p.vendor, p.vendorLabel)} ·{" "}
                            {kiik69ItemLabel(p.item, p.itemLabel)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-white/30 tabular-nums">
                            {formatKiik69Timestamp(p.createdAt, p.purchaseDate)}
                          </p>
                          {p.aiSummary ? (
                            <p className="mt-1 line-clamp-1 text-[11px] text-white/30">{p.aiSummary}</p>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-amber-200/90">{formatInr(p.amount)}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {detail ? (
        <Kiik69PurchaseDetail
          purchase={detail}
          onClose={() => setDetail(null)}
          onEdit={() => openEdit(detail)}
          onDelete={async (password) => {
            await remove(detail.id, password);
          }}
        />
      ) : null}

      {showForm ? (
        <Kiik69PurchaseForm
          key={editingId ?? "new"}
          form={form}
          setForm={setForm}
          vendorChips={vendorChips}
          paymentChips={paymentChips}
          itemChips={itemChips}
          editing={Boolean(editingId)}
          saving={saving}
          uploading={uploading}
          scanning={scanning}
          error={error}
          onClose={() => {
            setShowForm(false);
            setEditingId(null);
          }}
          onSave={() => void save()}
          onUploadFiles={(files) => void uploadFiles(files)}
          onEnterReview={enterReview}
        />
      ) : null}
    </>
  );
}
