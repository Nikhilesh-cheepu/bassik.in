import OpenAI from "openai";

export type Kiik69PurchaseAiResult = {
  title: string;
  amount: number | null;
  billTotal: number | null;
  amountPaid: number | null;
  purchaseDate: string | null;
  aiSummary: string;
  transactionIds: string[];
  paymentApp: string | null;
  payeeName: string | null;
  suggestedVendor: string | null;
  suggestedPayment: string | null;
  suggestedItem: string | null;
  suggestedItemName: string | null;
  notes: string;
};

const SYSTEM_PROMPT = `You are a smart accountant AI for KIIK 69 shared kitchen (Hyderabad, India). You read purchase bills, invoices, and payment screenshots.
Return JSON only:
{
  "title": string,
  "amount": number | null,
  "billTotal": number | null,
  "amountPaid": number | null,
  "purchaseDate": string,
  "aiSummary": string,
  "notes": string,
  "transactionIds": string[],
  "paymentApp": string,
  "payeeName": string,
  "suggestedVendor": string,
  "suggestedPayment": string,
  "suggestedItem": string,
  "suggestedItemName": string,
  "lineItems": [{ "name": string, "qty": string, "amount": number | null }]
}

MONEY RULES (critical):
- billTotal: grand total on bill/invoice (₹) before or including tax — what was purchased.
- amountPaid: actual money paid shown on payment screenshot or "paid" line — use this when it's a UPI/bank proof.
- amount: the single best number to log as kitchen spend — prefer amountPaid if payment proof, else billTotal, else largest clear total on document. Never guess.
- In aiSummary, always state clearly: "Bill total: ₹X" and/or "Paid: ₹Y" when visible. If they differ, explain both.

PAYMENT SCREENSHOT RULES (GPay, PhonePe, Paytm, BharatPe, bank apps, UPI):
- Extract ALL visible transaction IDs into transactionIds array — e.g. UPI Ref No, UTR, Transaction ID, Ref ID, Order ID, 12-digit UPI number, IMPS/NEFT ref. Copy exactly as shown.
- paymentApp: app name if visible (Google Pay, PhonePe, Paytm, etc.) or "".
- payeeName: who received payment (merchant/person) or "".
- suggestedPayment: usually "upi" for UPI screenshots.
- aiSummary must include: Paid ₹X to [payee] via [app]. Transaction ID(s): [list].

BILL/INVOICE RULES:
- lineItems: each line with name, qty, amount.
- aiSummary: items, vendor, tax/GST, order id if any.
- suggestedVendor: zepto, instamart, blinkit, spar, croma, hyperpu, geomart, mrp, bottles, mrp_bottles, other — or "".

Other fields:
- purchaseDate: YYYY-MM-DD if visible, else "".
- suggestedPayment: upi, cash, card, bank_transfer, credit, other — or "".
- suggestedItem: groceries, vegetables, meat, dairy, beverages, packaging, cleaning, kitchen, other — or "".
Do not invent amounts, dates, or transaction IDs not on the document.`;

function isAllowedBillUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return (
      host.endsWith(".public.blob.vercel-storage.com") ||
      host.endsWith(".blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

async function fetchDocument(documentUrl: string): Promise<{ mime: string; buf: Buffer }> {
  const res = await fetch(documentUrl, { redirect: "follow", signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Could not load document (${res.status}).`);
  const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "application/octet-stream";
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 12 * 1024 * 1024) throw new Error("File is too large for AI scan (max 12MB).");
  return { mime, buf };
}

function parseInrAmount(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return Math.round(raw * 100) / 100;
}

function parseAiJson(raw: string): Kiik69PurchaseAiResult {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const billTotal = parseInrAmount(parsed.billTotal);
  const amountPaid = parseInrAmount(parsed.amountPaid);
  const amountRaw = parseInrAmount(parsed.amount);
  const amount = amountPaid ?? billTotal ?? amountRaw;

  const transactionIds = Array.isArray(parsed.transactionIds)
    ? parsed.transactionIds
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        .map((id) => id.trim().slice(0, 80))
        .slice(0, 8)
    : [];

  const paymentApp =
    typeof parsed.paymentApp === "string" && parsed.paymentApp.trim()
      ? parsed.paymentApp.trim().slice(0, 60)
      : null;
  const payeeName =
    typeof parsed.payeeName === "string" && parsed.payeeName.trim()
      ? parsed.payeeName.trim().slice(0, 120)
      : null;

  const purchaseDate =
    typeof parsed.purchaseDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.purchaseDate.trim())
      ? parsed.purchaseDate.trim()
      : null;
  let aiSummary =
    typeof parsed.aiSummary === "string" ? parsed.aiSummary.trim().slice(0, 2000) : "";
  const notes =
    typeof parsed.notes === "string" ? parsed.notes.trim().slice(0, 2000) : aiSummary;

  const moneyLines: string[] = [];
  if (billTotal != null) moneyLines.push(`Bill total: ₹${billTotal}`);
  if (amountPaid != null) moneyLines.push(`Paid: ₹${amountPaid}`);
  if (transactionIds.length > 0) moneyLines.push(`Txn ID: ${transactionIds.join(", ")}`);
  if (paymentApp) moneyLines.push(`Via ${paymentApp}`);
  if (payeeName) moneyLines.push(`To: ${payeeName}`);

  const lineItemsRaw = Array.isArray(parsed.lineItems) ? parsed.lineItems : [];
  const lineBlock = lineItemsRaw
    .slice(0, 12)
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const name = typeof (row as { name?: unknown }).name === "string" ? (row as { name: string }).name.trim() : "";
      if (!name) return null;
      const qty = typeof (row as { qty?: unknown }).qty === "string" ? (row as { qty: string }).qty.trim() : "";
      const amt =
        typeof (row as { amount?: unknown }).amount === "number" &&
        Number.isFinite((row as { amount: number }).amount)
          ? ` ₹${(row as { amount: number }).amount}`
          : "";
      return `• ${name}${qty ? ` (${qty})` : ""}${amt}`;
    })
    .filter(Boolean)
    .join("\n");

  const enrichedSummary = [
    moneyLines.length ? moneyLines.join("\n") : "",
    aiSummary,
    lineBlock ? `Items:\n${lineBlock}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 2000);

  return {
    title: typeof parsed.title === "string" ? parsed.title.trim().slice(0, 200) : "",
    amount,
    billTotal,
    amountPaid,
    purchaseDate,
    aiSummary: enrichedSummary,
    notes: notes || enrichedSummary,
    transactionIds,
    paymentApp,
    payeeName,
    suggestedVendor:
      typeof parsed.suggestedVendor === "string" ? parsed.suggestedVendor.trim().slice(0, 40) : null,
    suggestedPayment:
      typeof parsed.suggestedPayment === "string" ? parsed.suggestedPayment.trim().slice(0, 40) : null,
    suggestedItem:
      typeof parsed.suggestedItem === "string" ? parsed.suggestedItem.trim().slice(0, 40) : null,
    suggestedItemName:
      typeof parsed.suggestedItemName === "string" ? parsed.suggestedItemName.trim().slice(0, 200) : null,
  };
}

async function runVisionScan(
  client: OpenAI,
  model: string,
  imageDataUrl: string,
  userHint: string
): Promise<Kiik69PurchaseAiResult> {
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.15,
    max_tokens: 1100,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: userHint },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
  });
  const raw = completion.choices[0]?.message?.content?.trim() || "{}";
  return parseAiJson(raw);
}

async function runTextScan(client: OpenAI, model: string, text: string, userHint: string): Promise<Kiik69PurchaseAiResult> {
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.15,
    max_tokens: 1100,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `${userHint}\n\nDocument text:\n${text.slice(0, 12_000)}`,
      },
    ],
  });
  const raw = completion.choices[0]?.message?.content?.trim() || "{}";
  return parseAiJson(raw);
}

async function loadPdfParser() {
  const mod = await import("pdf-parse");
  return mod.PDFParse;
}

async function pdfFirstPageImageDataUrl(buf: Buffer): Promise<string | null> {
  const PDFParse = await loadPdfParser();
  const parser = new PDFParse({ data: buf });
  try {
    const shot = await parser.getScreenshot({
      partial: [1],
      imageDataUrl: true,
      scale: 1.5,
    });
    const page = shot.pages[0];
    return page?.dataUrl ?? null;
  } catch {
    return null;
  } finally {
    await parser.destroy().catch(() => {});
  }
}

async function pdfExtractText(buf: Buffer): Promise<string> {
  const PDFParse = await loadPdfParser();
  const parser = new PDFParse({ data: buf });
  try {
    const text = await parser.getText();
    return text.text?.trim() ?? "";
  } catch {
    return "";
  } finally {
    await parser.destroy().catch(() => {});
  }
}

export async function analyzeKiik69PurchaseBill(input: {
  documentUrl: string;
  mimeType?: string;
  docCategory?: string;
  vendor?: string;
  paymentMethod?: string;
  item?: string;
}): Promise<Kiik69PurchaseAiResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("AI is not configured (missing OPENAI_API_KEY).");

  const documentUrl = input.documentUrl.trim();
  if (!documentUrl || !isAllowedBillUrl(documentUrl)) {
    throw new Error("Upload the document first, then run AI scan.");
  }

  const { mime, buf } = await fetchDocument(documentUrl);
  const isPdf = mime === "application/pdf" || documentUrl.toLowerCase().includes(".pdf");
  const isImage = mime.startsWith("image/");

  const client = new OpenAI({ apiKey });
  const model =
    process.env.OPENAI_VISION_MODEL?.trim() ||
    process.env.OPENAI_OFFER_VISION_MODEL?.trim() ||
    "gpt-4o-mini";

  const categoryHint =
    input.docCategory === "payment"
      ? " This is a PAYMENT SCREENSHOT (UPI/bank). Extract amount PAID, all transaction/reference IDs (UPI ref, UTR, txn id), payment app, and payee name."
      : input.docCategory === "invoice"
        ? " This is an invoice — extract bill total and line items."
        : input.docCategory === "bill"
          ? " This is a purchase bill — extract bill total and what was bought."
          : "";

  const userHint = `Extract purchase details.${categoryHint}${input.vendor ? ` User selected vendor: ${input.vendor}.` : ""}${input.paymentMethod ? ` User selected payment: ${input.paymentMethod}.` : ""}${input.item ? ` User selected item category: ${input.item}.` : ""}`;

  if (isImage) {
    const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
    return runVisionScan(client, model, dataUrl, userHint);
  }

  if (isPdf) {
    const text = await pdfExtractText(buf);
    if (text.length >= 80) {
      return runTextScan(client, model, text, userHint);
    }
    const pageImage = await pdfFirstPageImageDataUrl(buf);
    if (pageImage) {
      return runVisionScan(client, model, pageImage, `${userHint} (scanned PDF — read from page image)`);
    }
    throw new Error("Could not read this PDF — try a photo of the bill instead.");
  }

  throw new Error("Upload an image or PDF for AI scan.");
}
