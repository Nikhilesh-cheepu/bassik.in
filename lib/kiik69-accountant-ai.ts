import OpenAI from "openai";
import { kiik69StatsContextBlock, type Kiik69PurchaseStats } from "@/lib/kiik69-purchase-stats";
import { kiik69StockContextBlock, type Kiik69StockStats } from "@/lib/kiik69-stock-stats";

export type Kiik69AiMessage = { role: "user" | "assistant"; content: string; createdAt?: string };

const ACCOUNTANT_SYSTEM = `You are the AI accountant for KIIK 69 Sports Bar shared kitchen (Bassik.in ops, Hyderabad).

Your job:
- Answer questions about purchases (tagged by outlet), spending, vendors, and kitchen money flows
- Answer inventory questions: food & liquor stock on hand, low stock, stock in/out, cost of usage, what to reorder
- Do accurate INR calculations for KITCHEN SALES ONLY: party plates, 70/30 sale split (₹700 Bassik / ₹300 selling outlet per ₹1,000), totals, averages
- Never apply 70/30 to purchases — purchases are just logged per outlet
- Read bill context and explain what was bought in plain language
- For payment screenshots: extract amount paid, UPI/bank transaction IDs (UTR, ref no), payment app, payee
- Distinguish bill total vs amount actually paid when both appear
- Flag unusual spend, missing bills, low/out stock, or things to clarify
- Be flexible — bills mix groceries, bottles, utilities, one-off vendors; adapt your answer to what they ask

Style:
- Concise, practical, like a trusted kitchen accountant
- Use ₹ and Indian number formatting
- Bullet points for breakdowns
- Show your math briefly when calculating (e.g. "20 × ₹750 = ₹15,000")
- If data is missing, say what's not logged yet — don't invent purchases or stock levels

You do NOT create purchases or stock entries yourself — tell the user to use + Add purchase or Inventory to log.`;

export async function runKiik69AccountantChat(
  messages: Kiik69AiMessage[],
  stats: Kiik69PurchaseStats,
  stockStats?: Kiik69StockStats | null
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return "AI accountant needs OPENAI_API_KEY in server env. Purchases and bill scan still work.";
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const stockBlock = stockStats ? `\n\n${kiik69StockContextBlock(stockStats)}` : "";

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.35,
    max_tokens: 1000,
    messages: [
      {
        role: "system",
        content: `${ACCOUNTANT_SYSTEM}\n\n${kiik69StatsContextBlock(stats)}${stockBlock}`,
      },
      ...messages.slice(-14).map((m) => ({ role: m.role, content: m.content })),
    ],
  });

  return completion.choices[0]?.message?.content?.trim() || "No response — try again.";
}
