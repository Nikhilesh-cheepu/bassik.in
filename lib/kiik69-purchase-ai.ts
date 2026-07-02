import OpenAI from "openai";

export type Kiik69PurchaseAiResult = {
  title: string;
  amount: number | null;
  purchaseDate: string | null;
  aiSummary: string;
  suggestedVendor: string | null;
  suggestedPayment: string | null;
};

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

async function fetchImageAsDataUrl(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl, { redirect: "follow", signal: AbortSignal.timeout(25_000) });
  if (!res.ok) throw new Error(`Could not load bill image (${res.status}).`);
  const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  if (!mime.startsWith("image/")) throw new Error("Bill file must be an image for AI scan.");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 4 * 1024 * 1024) throw new Error("Image is too large for AI scan.");
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function analyzeKiik69PurchaseBill(input: {
  imageUrl: string;
  vendor?: string;
  paymentMethod?: string;
}): Promise<Kiik69PurchaseAiResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("AI is not configured (missing OPENAI_API_KEY).");

  const imageUrl = input.imageUrl.trim();
  if (!imageUrl || !isAllowedBillUrl(imageUrl)) {
    throw new Error("Upload the bill first, then run AI scan.");
  }

  const imageForVision = await fetchImageAsDataUrl(imageUrl);
  const client = new OpenAI({ apiKey });
  const model =
    process.env.OPENAI_VISION_MODEL?.trim() ||
    process.env.OPENAI_OFFER_VISION_MODEL?.trim() ||
    "gpt-4o-mini";

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.15,
    max_tokens: 500,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You read purchase bills / invoices for KIIK 69 shared kitchen (Hyderabad nightlife group).
Return JSON only:
{
  "title": string,
  "amount": number | null,
  "purchaseDate": string,
  "aiSummary": string,
  "suggestedVendor": string,
  "suggestedPayment": string
}

Rules:
- title: short purchase label ≤ 80 chars (what was bought).
- amount: total INR as number if visible, else null.
- purchaseDate: YYYY-MM-DD if visible, else "".
- aiSummary: 2–4 lines — items, qty hints, vendor name on bill, tax, order id. Plain text for a notes field.
- suggestedVendor: one of zepto, instamart, blinkit, swaar, croma, hyper, pure, mrp, bottles, other — or "" if unclear.
- suggestedPayment: one of upi, cash, card, bank_transfer, credit, other — or "" if unclear.
Do not invent amounts or dates not on the bill.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract purchase details.${input.vendor ? ` User selected vendor: ${input.vendor}.` : ""}${input.paymentMethod ? ` User selected payment: ${input.paymentMethod}.` : ""}`,
          },
          { type: "image_url", image_url: { url: imageForVision } },
        ],
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() || "{}";
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const amount =
    typeof parsed.amount === "number" && Number.isFinite(parsed.amount)
      ? Math.round(parsed.amount * 100) / 100
      : null;
  const purchaseDate =
    typeof parsed.purchaseDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.purchaseDate.trim())
      ? parsed.purchaseDate.trim()
      : null;

  return {
    title: typeof parsed.title === "string" ? parsed.title.trim().slice(0, 200) : "",
    amount,
    purchaseDate,
    aiSummary: typeof parsed.aiSummary === "string" ? parsed.aiSummary.trim().slice(0, 2000) : "",
    suggestedVendor:
      typeof parsed.suggestedVendor === "string" ? parsed.suggestedVendor.trim().slice(0, 40) : null,
    suggestedPayment:
      typeof parsed.suggestedPayment === "string" ? parsed.suggestedPayment.trim().slice(0, 40) : null,
  };
}
