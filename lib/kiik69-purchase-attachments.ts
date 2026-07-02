/** Document type tags — optional; empty string means untagged. */
export type Kiik69DocType = "" | "bill" | "invoice" | "payment" | "other";

export type Kiik69PurchaseAttachment = {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  docType: Kiik69DocType;
  docLabel?: string | null;
  aiNote?: string | null;
  transactionIds?: string[] | null;
  amountPaid?: number | null;
  billTotal?: number | null;
};

export function newKiik69AttachmentId(): string {
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function parseKiik69Attachments(raw: unknown): Kiik69PurchaseAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row): Kiik69PurchaseAttachment | null => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const url = typeof o.url === "string" ? o.url.trim() : "";
      if (!url) return null;
      const docTypeRaw = typeof o.docType === "string" ? o.docType.trim() : "";
      const docType: Kiik69DocType =
        docTypeRaw === "bill" ||
        docTypeRaw === "invoice" ||
        docTypeRaw === "payment" ||
        docTypeRaw === "other"
          ? docTypeRaw
          : "";
      return {
        id: typeof o.id === "string" && o.id ? o.id : newKiik69AttachmentId(),
        url,
        fileName: typeof o.fileName === "string" ? o.fileName.slice(0, 200) : "Document",
        mimeType: typeof o.mimeType === "string" ? o.mimeType.slice(0, 80) : "",
        docType,
        docLabel: typeof o.docLabel === "string" ? o.docLabel.slice(0, 120) : null,
        aiNote: typeof o.aiNote === "string" ? o.aiNote.slice(0, 2000) : null,
        transactionIds: Array.isArray(o.transactionIds)
          ? o.transactionIds.filter((id): id is string => typeof id === "string").slice(0, 8)
          : null,
        amountPaid:
          typeof o.amountPaid === "number" && Number.isFinite(o.amountPaid) ? o.amountPaid : null,
        billTotal:
          typeof o.billTotal === "number" && Number.isFinite(o.billTotal) ? o.billTotal : null,
      };
    })
    .filter((a): a is Kiik69PurchaseAttachment => Boolean(a));
}

export function attachmentsFromLegacyPurchase(input: {
  attachments?: unknown;
  billUrl?: string | null;
  billFileName?: string | null;
  billDocType?: string | null;
  paymentProofUrl?: string | null;
  paymentProofFileName?: string | null;
}): Kiik69PurchaseAttachment[] {
  const fromJson = parseKiik69Attachments(input.attachments);
  if (fromJson.length > 0) return fromJson;

  const legacy: Kiik69PurchaseAttachment[] = [];
  if (input.billUrl) {
    legacy.push({
      id: newKiik69AttachmentId(),
      url: input.billUrl,
      fileName: input.billFileName ?? "Bill",
      mimeType: "",
      docType: input.billDocType === "invoice" ? "invoice" : "bill",
    });
  }
  if (input.paymentProofUrl) {
    legacy.push({
      id: newKiik69AttachmentId(),
      url: input.paymentProofUrl,
      fileName: input.paymentProofFileName ?? "Payment proof",
      mimeType: "",
      docType: "payment",
    });
  }
  return legacy;
}

/** Keep legacy bill/payment columns in sync for older queries. */
export function syncLegacyAttachmentFields(attachments: Kiik69PurchaseAttachment[]) {
  const billLike =
    attachments.find((a) => a.docType === "invoice") ??
    attachments.find((a) => a.docType === "bill") ??
    attachments.find((a) => a.docType !== "payment" && a.docType !== "other" && a.docType !== "");
  const payment = attachments.find((a) => a.docType === "payment");

  const stored = attachments.map((a) => ({
    id: a.id,
    url: a.url,
    fileName: a.fileName,
    mimeType: a.mimeType,
    docType: a.docType || null,
    docLabel: a.docLabel ?? null,
    aiNote: a.aiNote ?? null,
    transactionIds: a.transactionIds ?? null,
    amountPaid: a.amountPaid ?? null,
    billTotal: a.billTotal ?? null,
  }));

  return {
    attachments: stored,
    billUrl: billLike?.url ?? null,
    billFileName: billLike?.fileName ?? null,
    billDocType:
      billLike?.docType === "invoice" ? "invoice" : billLike ? "bill" : null,
    paymentProofUrl: payment?.url ?? null,
    paymentProofFileName: payment?.fileName ?? null,
  };
}

export const KIIK69_DOC_TYPE_OPTIONS: { id: Kiik69DocType; label: string }[] = [
  { id: "", label: "Skip" },
  { id: "bill", label: "Bill" },
  { id: "invoice", label: "Invoice" },
  { id: "payment", label: "Payment" },
  { id: "other", label: "Other" },
];

export function kiik69DocTypeLabel(docType: Kiik69DocType, docLabel?: string | null): string {
  if (docType === "other" && docLabel?.trim()) return docLabel.trim();
  const opt = KIIK69_DOC_TYPE_OPTIONS.find((o) => o.id === docType);
  return opt?.label && docType ? opt.label : "Document";
}
