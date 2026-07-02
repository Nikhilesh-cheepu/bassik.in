"use client";

import { useState } from "react";
import { TeamDatePicker } from "@/app/team/TeamDatePicker";
import type { Kiik69OptionChip } from "@/lib/kiik69-custom-options";
import {
  KIIK69_DOC_TYPE_OPTIONS,
  kiik69DocTypeLabel,
  type Kiik69DocType,
  type Kiik69PurchaseAttachment,
} from "@/lib/kiik69-purchase-attachments";
import { KIIK69_PURCHASE_OUTLETS } from "@/lib/kiik69-accounts";
import { IconChevronLeft } from "./Kiik69Icons";
import {
  KIIK69_BTN,
  KIIK69_INPUT,
  KIIK69_SHEET_BODY,
  KIIK69_SHEET_OVERLAY,
  KIIK69_SHEET_PANEL_FLEX,
  Kiik69SheetPortal,
  kiik69FilterChip,
} from "./Kiik69Nav";

export type PurchaseFormData = {
  outlet: string;
  outletOther: string;
  vendor: string;
  vendorOther: string;
  paymentMethod: string;
  paymentOther: string;
  item: string;
  itemOther: string;
  amount: string;
  purchaseDate: string;
  title: string;
  description: string;
  aiSummary: string;
  attachments: Kiik69PurchaseAttachment[];
  purchaseLink: string;
};

const STEPS = ["Details", "Upload", "Review"] as const;

function buildAiDisplayText(form: PurchaseFormData): string {
  if (form.aiSummary?.trim()) return form.aiSummary.trim();
  const lines = form.attachments
    .filter((a) => a.aiNote?.trim())
    .map((a) => `${a.fileName}\n${a.aiNote}`);
  return lines.join("\n\n");
}

function hasAiContent(form: PurchaseFormData, isScanning: boolean): boolean {
  return Boolean(buildAiDisplayText(form)) || isScanning;
}

function OtherInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${KIIK69_INPUT} mt-2`}
      autoFocus
    />
  );
}

function ChipSection({
  label,
  chips,
  value,
  otherValue,
  onSelect,
  onOtherChange,
  otherPlaceholder,
}: {
  label: string;
  chips: Kiik69OptionChip[];
  value: string;
  otherValue: string;
  onSelect: (id: string) => void;
  onOtherChange: (v: string) => void;
  otherPlaceholder: string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-white/45">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={kiik69FilterChip(value === c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      {value === "other" ? (
        <OtherInput value={otherValue} onChange={onOtherChange} placeholder={otherPlaceholder} />
      ) : null}
    </div>
  );
}

export default function Kiik69PurchaseForm({
  form,
  setForm,
  vendorChips,
  paymentChips,
  itemChips,
  editing,
  saving,
  uploading,
  scanning,
  error,
  onClose,
  onSave,
  onUploadFiles,
  onEnterReview,
}: {
  form: PurchaseFormData;
  setForm: React.Dispatch<React.SetStateAction<PurchaseFormData>>;
  vendorChips: Kiik69OptionChip[];
  paymentChips: Kiik69OptionChip[];
  itemChips: Kiik69OptionChip[];
  editing: boolean;
  saving: boolean;
  uploading: boolean;
  scanning: boolean;
  error: string | null;
  onClose: () => void;
  onSave: () => void;
  onUploadFiles: (files: FileList | File[]) => void;
  onEnterReview: (ctx: PurchaseFormData) => Promise<void>;
}) {
  const [step, setStep] = useState(
    editing && form.outlet && form.vendor && form.paymentMethod && form.item ? 2 : 0
  );
  const [preparingReview, setPreparingReview] = useState(false);

  const otherOk = (id: string, other: string) => id !== "other" || other.trim().length > 0;
  const detailsOk =
    form.outlet &&
    otherOk(form.outlet, form.outletOther) &&
    form.vendor &&
    form.paymentMethod &&
    form.item &&
    otherOk(form.vendor, form.vendorOther) &&
    otherOk(form.paymentMethod, form.paymentOther) &&
    otherOk(form.item, form.itemOther);

  const goBack = () => {
    if (step === 0) onClose();
    else setStep((s) => s - 1);
  };

  const goToReview = async () => {
    setPreparingReview(true);
    try {
      await onEnterReview(form);
      setStep(2);
    } finally {
      setPreparingReview(false);
    }
  };

  const updateAttachment = (id: string, patch: Partial<Kiik69PurchaseAttachment>) => {
    setForm((f) => ({
      ...f,
      attachments: f.attachments.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  };

  const removeAttachment = (id: string) => {
    setForm((f) => ({ ...f, attachments: f.attachments.filter((a) => a.id !== id) }));
  };

  return (
    <Kiik69SheetPortal>
      <div className={KIIK69_SHEET_OVERLAY} onClick={onClose}>
        <div className={KIIK69_SHEET_PANEL_FLEX} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="shrink-0">
            <div className="mb-3 flex items-center gap-2">
              <button type="button" onClick={goBack} className="rounded-lg p-2 text-white/50 active:bg-white/[0.06]">
                <IconChevronLeft />
              </button>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold">{editing ? "Edit purchase" : "New purchase"}</h3>
                <p className="text-xs text-white/40">
                  Step {step + 1}/{STEPS.length} · {STEPS[step]}
                </p>
              </div>
            </div>

            <div className="mb-4 flex justify-center gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all ${i <= step ? "w-5 bg-amber-400" : "w-1.5 bg-white/15"}`}
                />
              ))}
            </div>
          </div>

          <div className={KIIK69_SHEET_BODY}>
            {step === 0 ? (
              <div className="space-y-4">
                <ChipSection
                label="Outlet — who is this purchase for?"
                chips={KIIK69_PURCHASE_OUTLETS.map((o) => ({ id: o.id, label: o.label, custom: false }))}
                value={form.outlet}
                otherValue={form.outletOther}
                onSelect={(id) => setForm((f) => ({ ...f, outlet: id, outletOther: id === "other" ? f.outletOther : "" }))}
                onOtherChange={(v) => setForm((f) => ({ ...f, outletOther: v }))}
                otherPlaceholder="Type outlet name"
              />
              <ChipSection
                label="Vendor"
                chips={vendorChips}
                value={form.vendor}
                otherValue={form.vendorOther}
                onSelect={(id) => setForm((f) => ({ ...f, vendor: id, vendorOther: id === "other" ? f.vendorOther : "" }))}
                onOtherChange={(v) => setForm((f) => ({ ...f, vendorOther: v }))}
                otherPlaceholder="Type vendor name"
              />
              <ChipSection
                label="Payment"
                chips={paymentChips}
                value={form.paymentMethod}
                otherValue={form.paymentOther}
                onSelect={(id) =>
                  setForm((f) => ({ ...f, paymentMethod: id, paymentOther: id === "other" ? f.paymentOther : "" }))
                }
                onOtherChange={(v) => setForm((f) => ({ ...f, paymentOther: v }))}
                otherPlaceholder="Type payment method"
              />
              <ChipSection
                label="Item — what is it?"
                chips={itemChips}
                value={form.item}
                otherValue={form.itemOther}
                onSelect={(id) => setForm((f) => ({ ...f, item: id, itemOther: id === "other" ? f.itemOther : "" }))}
                onOtherChange={(v) => setForm((f) => ({ ...f, itemOther: v }))}
                otherPlaceholder="Type item name"
              />
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-4">
            <p className="text-xs text-white/40">
              Add bills, invoices, payment screenshots, PDFs — as many as you need. Tag them on the next step (optional).
            </p>

            <label className="block cursor-pointer">
              <div
                className={`flex flex-col items-center justify-center rounded-xl border border-dashed py-8 ${
                  uploading ? "border-amber-500/30 bg-amber-500/5" : "border-white/10 bg-black/20"
                }`}
              >
                <p className="text-sm font-medium text-white/80">
                  {uploading ? "Uploading…" : "Tap to add files"}
                </p>
                <p className="mt-1 text-xs text-white/35">Image or PDF · multiple allowed</p>
              </div>
              <input
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files?.length) onUploadFiles(files);
                  e.target.value = "";
                }}
              />
            </label>

            {form.attachments.length > 0 ? (
              <ul className="space-y-2">
                {form.attachments.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white/85">{a.fileName}</p>
                        <p className="text-[10px] text-white/35">
                          {a.mimeType?.includes("pdf") ? "PDF" : "Image"} · saved to cloud
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(a.id)}
                        className="shrink-0 text-xs text-red-300/80"
                      >
                        Remove
                      </button>
                    </div>
                    {a.aiNote ? (
                      <p className="mt-2 text-xs leading-relaxed text-white/50">{a.aiNote}</p>
                    ) : scanning ? (
                      <p className="mt-2 text-xs text-amber-200/60">AI reading this file…</p>
                    ) : null}
                    {a.transactionIds && a.transactionIds.length > 0 ? (
                      <p className="mt-1 text-[11px] text-amber-200/70">
                        Txn: {a.transactionIds.join(" · ")}
                      </p>
                    ) : null}
                    {a.amountPaid != null || a.billTotal != null ? (
                      <p className="mt-1 text-[11px] text-white/45">
                        {a.billTotal != null ? `Bill ₹${a.billTotal}` : ""}
                        {a.billTotal != null && a.amountPaid != null ? " · " : ""}
                        {a.amountPaid != null ? `Paid ₹${a.amountPaid}` : ""}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-xs text-white/30">No files yet — you can skip and add details only.</p>
            )}

            {form.attachments.length > 0 && (scanning || form.aiSummary || form.attachments.some((a) => a.aiNote)) ? (
              <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.07] px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-300/85">
                  What AI sees
                </p>
                {scanning ? (
                  <p className="mt-1.5 text-xs text-white/45">Reading your documents…</p>
                ) : null}
                {form.aiSummary ? (
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-white/60">{form.aiSummary}</p>
                ) : form.attachments.some((a) => a.aiNote) ? (
                  <ul className="mt-2 space-y-2">
                    {form.attachments
                      .filter((a) => a.aiNote)
                      .map((a) => (
                        <li key={a.id}>
                          <p className="text-[11px] font-medium text-white/55">{a.fileName}</p>
                          <p className="text-xs leading-relaxed text-white/50">{a.aiNote}</p>
                        </li>
                      ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                {(form.attachments.length > 0 || hasAiContent(form, scanning || preparingReview)) && (
                  <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.08] px-3 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-300/85">
                      What AI read from your files
                    </p>
                    {scanning || preparingReview ? (
                      <p className="mt-2 text-xs text-amber-200/70">Reading documents…</p>
                    ) : buildAiDisplayText(form) ? (
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-white/65">
                        {buildAiDisplayText(form)}
                      </p>
                    ) : form.attachments.length > 0 ? (
                      <p className="mt-2 text-xs text-white/40">
                        AI could not read these files — add amount and notes manually below.
                      </p>
                    ) : null}
                  </div>
                )}

                {form.attachments.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-white/45">Tag each file (optional)</p>
                    {form.attachments.map((a) => (
                      <div key={a.id} className="rounded-xl border border-white/10 bg-[#0e0e14] p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white/90">{a.fileName}</p>
                            <a
                              href={a.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-amber-300/80"
                            >
                              Open file
                            </a>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {KIIK69_DOC_TYPE_OPTIONS.map((opt) => (
                            <button
                              key={opt.id || "skip"}
                              type="button"
                              onClick={() =>
                                updateAttachment(a.id, {
                                  docType: opt.id as Kiik69DocType,
                                  docLabel: opt.id === "other" ? a.docLabel ?? "" : null,
                                })
                              }
                              className={kiik69FilterChip(a.docType === opt.id)}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        {a.docType === "other" ? (
                          <OtherInput
                            value={a.docLabel ?? ""}
                            onChange={(v) => updateAttachment(a.id, { docLabel: v })}
                            placeholder="What is this document?"
                          />
                        ) : null}
                        {a.docType ? (
                          <p className="mt-1 text-[10px] text-white/30">
                            Tagged as {kiik69DocTypeLabel(a.docType, a.docLabel)}
                          </p>
                        ) : null}
                        {a.aiNote ? (
                          <p className="mt-2 text-xs leading-relaxed text-white/50">{a.aiNote}</p>
                        ) : null}
                        {a.transactionIds && a.transactionIds.length > 0 ? (
                          <p className="mt-1 text-[11px] font-medium text-amber-200/75">
                            Txn ID: {a.transactionIds.join(" · ")}
                          </p>
                        ) : null}
                        {a.amountPaid != null || a.billTotal != null ? (
                          <p className="mt-0.5 text-[11px] text-white/45">
                            {a.billTotal != null ? `Bill ₹${a.billTotal}` : ""}
                            {a.billTotal != null && a.amountPaid != null ? " · " : ""}
                            {a.amountPaid != null ? `Paid ₹${a.amountPaid}` : ""}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-3 border-t border-white/[0.06] pt-3">
                  <p className="text-xs font-medium text-white/45">Fill in details</p>
                  <input
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="Amount (₹)"
                    className={`${KIIK69_INPUT} text-center text-2xl font-semibold`}
                  />
                  <TeamDatePicker
                    value={form.purchaseDate}
                    onChange={(v) => setForm((f) => ({ ...f, purchaseDate: v }))}
                    placeholder="Date"
                    clearable
                    accent="amber"
                    compact
                  />
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Title (optional)"
                    className={KIIK69_INPUT}
                  />
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Your notes"
                    rows={2}
                    className={KIIK69_INPUT}
                  />
                  <input
                    value={form.purchaseLink}
                    onChange={(e) => setForm((f) => ({ ...f, purchaseLink: e.target.value }))}
                    placeholder="Order link (optional)"
                    className={KIIK69_INPUT}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-white/[0.06] pt-3">
            {step === 0 ? (
              <button
                type="button"
                disabled={!detailsOk}
                onClick={() => setStep(1)}
                className={`min-h-[48px] w-full ${KIIK69_BTN}`}
              >
                Continue to upload
              </button>
            ) : null}

            {step === 1 ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void goToReview()}
                  disabled={preparingReview || uploading}
                  className="min-h-[48px] flex-1 rounded-xl border border-white/10 text-sm text-white/60"
                >
                  {form.attachments.length === 0 ? "Skip upload" : "Skip tagging"}
                </button>
                <button
                  type="button"
                  disabled={preparingReview || uploading}
                  onClick={() => void goToReview()}
                  className={`min-h-[48px] flex-[2] ${KIIK69_BTN}`}
                >
                  {preparingReview || scanning ? "AI reading…" : "Continue"}
                </button>
              </div>
            ) : null}

            {step === 2 ? (
              <>
                {error ? (
                  <p className="mb-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={!detailsOk || saving || uploading || scanning}
                  onClick={onSave}
                  className={`min-h-[48px] w-full ${KIIK69_BTN}`}
                >
                  {saving ? "Saving…" : editing ? "Update purchase" : "Save purchase"}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </Kiik69SheetPortal>
  );
}
