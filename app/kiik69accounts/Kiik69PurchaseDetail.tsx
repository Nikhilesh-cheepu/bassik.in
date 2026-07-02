"use client";

import { useState } from "react";
import {
  kiik69ItemLabel,
  kiik69OutletLabel,
  kiik69PaymentLabel,
  kiik69VendorLabel,
  type Kiik69PurchaseDto,
} from "@/lib/kiik69-accounts";
import { kiik69DocTypeLabel, type Kiik69DocType } from "@/lib/kiik69-purchase-attachments";
import { formatKiik69Timestamp } from "@/lib/kiik69-datetime";
import { IconChevronLeft } from "./Kiik69Icons";
import { KIIK69_BTN, KIIK69_INPUT, KIIK69_SHEET_OVERLAY, KIIK69_SHEET_PANEL, Kiik69SheetPortal } from "./Kiik69Nav";

function formatInr(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function formatDate(ymd: string | null): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "—";
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function Kiik69PurchaseDetail({
  purchase,
  onClose,
  onEdit,
  onDelete,
}: {
  purchase: Kiik69PurchaseDto;
  onClose: () => void;
  onEdit: () => void;
  onDelete: (password: string) => Promise<void>;
}) {
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const allAttachments =
    purchase.attachments.length > 0
      ? purchase.attachments
      : [
          ...(purchase.billUrl
            ? [
                {
                  id: "legacy-bill",
                  url: purchase.billUrl,
                  fileName: purchase.billFileName ?? "Bill",
                  mimeType: "",
                  docType: (purchase.billDocType === "invoice" ? "invoice" : "bill") as Kiik69DocType,
                  docLabel: null,
                },
              ]
            : []),
          ...(purchase.paymentProofUrl
            ? [
                {
                  id: "legacy-payment",
                  url: purchase.paymentProofUrl,
                  fileName: purchase.paymentProofFileName ?? "Payment proof",
                  mimeType: "",
                  docType: "payment" as Kiik69DocType,
                  docLabel: null,
                },
              ]
            : []),
        ];

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(deletePassword);
      setShowDelete(false);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Kiik69SheetPortal>
      <div className={KIIK69_SHEET_OVERLAY} onClick={onClose}>
        <div
          className={`${KIIK69_SHEET_PANEL} max-h-[92dvh] max-w-md overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
        <div className="mb-4 flex items-center gap-2">
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-white/50 active:bg-white/[0.06]">
            <IconChevronLeft />
          </button>
          <h3 className="text-lg font-semibold">Purchase</h3>
        </div>

        <p className="text-center text-3xl font-semibold text-white">{formatInr(purchase.amount)}</p>
        <p className="mt-1 text-center text-sm text-white/45">
          {purchase.title || kiik69ItemLabel(purchase.item, purchase.itemLabel)}
        </p>

        <dl className="mt-5 space-y-2.5 rounded-xl bg-[#0e0e14] p-4 ring-1 ring-white/[0.06]">
          <div className="flex justify-between gap-4 text-sm">
            <dt className="text-white/40">Outlet</dt>
            <dd className="text-right text-white/85">{kiik69OutletLabel(purchase.outlet, purchase.outletLabel)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <dt className="text-white/40">Item</dt>
            <dd className="text-right text-white/85">{kiik69ItemLabel(purchase.item, purchase.itemLabel)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <dt className="text-white/40">Vendor</dt>
            <dd className="text-right text-white/85">{kiik69VendorLabel(purchase.vendor, purchase.vendorLabel)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <dt className="text-white/40">Payment</dt>
            <dd className="text-right text-white/85">
              {kiik69PaymentLabel(purchase.paymentMethod, purchase.paymentLabel)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <dt className="text-white/40">Date</dt>
            <dd className="text-white/85">{formatDate(purchase.purchaseDate)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <dt className="text-white/40">Logged</dt>
            <dd className="text-[11px] text-white/40 tabular-nums">
              {formatKiik69Timestamp(purchase.createdAt, purchase.purchaseDate)}
            </dd>
          </div>
          {allAttachments.length > 0 ? (
            <div className="space-y-2 border-t border-white/[0.06] pt-2">
              <dt className="text-sm text-white/40">Documents</dt>
              {allAttachments.map((a) => (
                <dd key={a.id} className="flex justify-between gap-4 text-sm">
                  <span className="truncate text-white/70">
                    {kiik69DocTypeLabel(a.docType, a.docLabel)} · {a.fileName}
                  </span>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 font-medium text-amber-300"
                  >
                    Open
                  </a>
                </dd>
              ))}
            </div>
          ) : null}
        </dl>

        {purchase.aiSummary ? (
          <div className="mt-3 rounded-xl border border-amber-400/15 bg-amber-500/5 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-amber-300/80">AI notes</p>
            <p className="mt-1 text-xs leading-relaxed text-white/50">{purchase.aiSummary}</p>
          </div>
        ) : null}

        {purchase.description && purchase.description !== purchase.aiSummary ? (
          <p className="mt-3 rounded-xl bg-[#0e0e14] px-3 py-2 text-xs text-white/45 ring-1 ring-white/[0.06]">
            {purchase.description}
          </p>
        ) : null}

        {showDelete ? (
          <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/5 p-3">
            <p className="text-sm text-white/75">Enter delete password to remove this purchase.</p>
            <input
              type="password"
              inputMode="numeric"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Delete password"
              className={`${KIIK69_INPUT} mt-2`}
              autoFocus
            />
            {deleteError ? <p className="mt-2 text-xs text-red-200">{deleteError}</p> : null}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDelete(false);
                  setDeletePassword("");
                  setDeleteError(null);
                }}
                className="min-h-[40px] flex-1 rounded-xl border border-white/10 text-sm text-white/60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!deletePassword.trim() || deleting}
                onClick={() => void confirmDelete()}
                className="min-h-[40px] flex-1 rounded-xl bg-red-500/80 text-sm font-semibold text-white disabled:opacity-40"
              >
                {deleting ? "Deleting…" : "Confirm delete"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={onEdit} className={`min-h-[48px] flex-1 ${KIIK69_BTN}`}>
              Edit
            </button>
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className="min-h-[48px] rounded-xl border border-white/10 px-4 text-sm text-red-300/80"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
    </Kiik69SheetPortal>
  );
}
