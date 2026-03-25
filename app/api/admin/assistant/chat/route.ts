import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSiteKnowledgeForAssistant } from "@/lib/admin/site-knowledge";
import { BRANDS } from "@/lib/brands";
import {
  countContactsByAgeRange,
  countGenderDistribution,
  countNameStats,
  countRepeatedCustomersByPhone,
  countUniqueCustomerPhones,
  countVisitFrequencySummary,
  countCustomerOutletInteractionSummary,
} from "@/lib/admin/assistant/automation-stats";
import { countMenuItemsForBrand } from "@/lib/admin/assistant/menu-stats";
import { countRecipientsForGroup, type GroupSpec } from "@/lib/admin/assistant/automation-group";

const MAX_MESSAGES = 40;
const MAX_CONTENT_PER_MESSAGE = 12_000;

type ChatRole = "user" | "assistant";

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function parseAgeRangeFromText(input: string): { min?: number; max?: number } | null {
  const t = input.toLowerCase();

  // Examples:
  // "age between 18 and 25"
  // "18-25"
  // "age > 20"
  const between = t.match(/between\s+(\d{1,3})\s*(?:-|to|and)\s*(\d{1,3})/i);
  if (between) {
    const min = Number(between[1]);
    const max = Number(between[2]);
    if (Number.isFinite(min) && Number.isFinite(max)) return { min, max };
  }

  const range = t.match(/(\d{1,3})\s*(?:-|to|and)\s*(\d{1,3})\s*(?:years|yrs|yo|y)?/i);
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    if (Number.isFinite(min) && Number.isFinite(max)) return { min, max };
  }

  const gte = t.match(/(?:>=|above|over)\s*(\d{1,3})/i);
  if (gte) {
    const min = Number(gte[1]);
    if (Number.isFinite(min)) return { min };
  }

  const lte = t.match(/(?:<=|below|under)\s*(\d{1,3})/i);
  if (lte) {
    const max = Number(lte[1]);
    if (Number.isFinite(max)) return { max };
  }

  return null;
}

function sanitizeMessages(raw: unknown): { role: ChatRole; content: string }[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("Send a non-empty messages array.");
  }
  if (raw.length > MAX_MESSAGES) {
    throw new Error(`At most ${MAX_MESSAGES} messages per request.`);
  }

  return raw.map((item, i) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Invalid message at index ${i}.`);
    }
    const role = (item as { role?: string }).role;
    const content = (item as { content?: string }).content;
    if (role !== "user" && role !== "assistant") {
      throw new Error(`Message ${i}: role must be user or assistant.`);
    }
    if (typeof content !== "string" || !content.trim()) {
      throw new Error(`Message ${i}: content must be a non-empty string.`);
    }
    return {
      role,
      content: content.slice(0, MAX_CONTENT_PER_MESSAGE),
    };
  });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  let messages: { role: ChatRole; content: string }[];
  try {
    messages = sanitizeMessages((body as { messages?: unknown }).messages);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid messages.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const knowledge = getSiteKnowledgeForAssistant();

  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user")?.content;

  const allUserText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");
  const userText = typeof allUserText === "string" ? allUserText : "";
  const lastUserText = typeof lastUserMessage === "string" ? lastUserMessage : "";
  const lastNt = normalizeForMatch(lastUserText);

  // For group actions ("send message to this group"), we take the most recent user message
  // that contains group-like keywords, to avoid mixing multiple different group definitions.
  const userMessages = messages
    .filter((m) => m.role === "user" && typeof m.content === "string")
    .map((m) => m.content as string);
  let groupContextText = lastUserText;
  for (const msg of [...userMessages].reverse()) {
    if (/\b(men|women|male|female|repeated|repeat(ed)?|age|between)\b/i.test(msg)) {
      groupContextText = msg;
      break;
    }
  }
  const groupNt = normalizeForMatch(groupContextText);

  // --- Intent 1: menu counts (e.g. "kiik69 menu items") ---
  const brandHit = BRANDS.find((b) => {
    const brandId = b.id.toLowerCase();
    const short = b.shortName.toLowerCase();
    const name = b.name.toLowerCase();
    return (
      lastNt.includes(brandId) ||
      (short.length >= 3 && lastNt.includes(short)) ||
      (name.length >= 3 && lastNt.includes(name))
    );
  });
  const isMenuQuestion = /\bmenu(s)?\b/.test(lastNt);
  if (
    brandHit &&
    isMenuQuestion &&
    (/\bhow many\b/.test(lastNt) || /\bcount\b/.test(lastNt) || /\bitems?\b/.test(lastNt))
  ) {
    const menuStats = await countMenuItemsForBrand(brandHit.id);
    const publicLink = `/${brandHit.id}`;
    const adminLink = `/admin/dashboard/venues`;

    if (!menuStats.venueExists) {
      return NextResponse.json({
        message:
          `I can’t find a venue in the database for \`${brandHit.id}\` yet (no admin venue configured). ` +
          `Set it up under ${adminLink}.`,
      });
    }

    return NextResponse.json({
      message:
        `${brandHit.shortName} has ` +
        `\`${menuStats.menuCount}\` menu type(s) and ` +
        `\`${menuStats.menuImageCount}\` menu page image(s) saved in the database.\n\n` +
        `Public venue link: ${publicLink}\n` +
        `Admin manage link: ${adminLink}`,
    });
  }

  const sendIntent =
    /\b(send|whatsapp|bulk\s*message|message\s*them|dispatch)\b/.test(lastNt) ||
    (/\bmessage\b/.test(lastNt) && /\bto\b/.test(lastNt));

  const wantsAll =
    /\b(all|everyone|everybody|whole\s*list|entire\s*list|everyone\s+in\s+this\s+list)\b/.test(lastNt) ||
    /\b(all\s+contacts|all\s+import)\b/.test(lastNt);

  const wantsMen = /\bmen\b/.test(groupNt) || /\bmale\b/.test(groupNt);
  const wantsWomen = /\bwomen\b/.test(groupNt) || /\bfemale\b/.test(groupNt);
  const wantsRepeated = /\brepeated\b/.test(groupNt) || /\brepeat(ed)?\b/.test(groupNt);
  const wantsAge = /\bage\b/.test(groupNt) || /\bbetween\b/.test(groupNt);
  const ageRange = wantsAge ? parseAgeRangeFromText(groupContextText) : null;

  const groupSpec: GroupSpec | null = (() => {
    const hasFilter = wantsMen || wantsWomen || wantsRepeated || ageRange != null;
    if (!hasFilter) return sendIntent && wantsAll ? { importScope: "all" } : null;
    const spec: GroupSpec = { importScope: "all" };
    if (wantsMen) spec.gender = "male";
    if (wantsWomen) spec.gender = "female";
    if (wantsRepeated) spec.repeated = true;
    if (ageRange) spec.age = ageRange;
    return spec;
  })();

  if (sendIntent && groupSpec) {
    // 1) Compute recipient count from DB (and detect which keys exist).
    const countRes = await countRecipientsForGroup(groupSpec);
    if (countRes.count <= 0) {
      const missingGender = groupSpec.gender && !countRes.genderKeyUsed;
      const missingAge = groupSpec.age && !countRes.ageKeyUsed;
      if (missingGender) {
        return NextResponse.json({
          message:
            `I can’t detect your gender field in imported data (expected something like \`extra.gender\`). ` +
            `Check your mapping to ensure a “gender/sex” column is mapped to \`extra\`.`,
        });
      }
      if (missingAge) {
        return NextResponse.json({
          message:
            `I can’t detect your age field in imported data (expected something like \`extra.age\`). ` +
            `Check mapping so your age column is mapped to \`extra\`.`,
        });
      }
      return NextResponse.json({
        message: `I found 0 recipients matching this group based on your conditions.`,
      });
    }

    // 2) Draft a template using your chat request.
    const apiModel = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    const apiKey = process.env.OPENAI_API_KEY?.trim() || "";
    const client = new OpenAI({ apiKey });

    const system = [
      "You draft WhatsApp message templates for Bassik staff.",
      "Use the exact placeholder `{{fullName}}` for personalization. Do NOT replace it with a real name.",
      "For recipients whose full name is missing, the server will replace `{{fullName}}` with the generic fallback `there` (so messages should read like `Hi there`).",
      "Write a short, polite message that fits Bassik’s vibe: book direct, website-only deals, limited slots, and CTA to reply.",
      "If the user’s request includes specific offer wording, keep it. Otherwise keep it generic without inventing prices.",
      "Output ONLY JSON: { \"template\": string }",
    ].join("\n");

    const userPayload = {
      userRequest: userText,
      group: groupSpec,
      siteConstraints: "Don't invent exact counts/prices. Use general Bassik messaging.",
    };

    const completion = await client.chat.completions.create({
      model: apiModel,
      response_format: { type: "json_object" },
      temperature: 0.35,
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      max_tokens: 400,
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    let template = "";
    try {
      const parsed = raw ? (JSON.parse(raw) as { template?: string }) : null;
      template = parsed?.template?.trim() || "";
    } catch {
      template = "";
    }
    if (!template) {
      template = "Hi {{fullName}}, book direct with Bassik to unlock website-only deals and limited slots. Reply YES and we’ll share the best timing.";
    }

    return NextResponse.json({
      message:
        `I’m ready to send this WhatsApp template to ${countRes.count} matching recipients.\n\n` +
        `Template preview:\n${template}\n\n` +
        "Click the Send button shown in the chat UI to dispatch.",
      action: {
        type: "send_whatsapp_group",
        group: groupSpec,
        messageTemplate: template,
        matchedCount: countRes.count,
      },
    });
  }

  // --- Intent 3: visit frequency + outlet interaction (from walking/booking guest list images) ---
  const wantsVisitFrequency = /\b(frequency|visit(s)?|how many times|walkin|walking guest|booking guest|guest list|guestlist|walking guest list)\b/i.test(lastNt);
  const wantsOutletInteraction = /\b(outlet|venue|branch).*(between|interaction|different|multiple)|multiple outlets|outlet pair|between outlets|visited.*outlet\b/i.test(lastNt);

  if (wantsVisitFrequency || wantsOutletInteraction) {
    const [freq, interaction] = await Promise.all([
      wantsVisitFrequency ? countVisitFrequencySummary() : Promise.resolve(null),
      wantsOutletInteraction ? countCustomerOutletInteractionSummary() : Promise.resolve(null),
    ]);

    const parts: string[] = [];

    if (freq) {
      if (!freq.dateKeyUsed) {
        parts.push(
          "I couldn’t detect a `visit_date` field in your imported `AutomationContact.extra`.\n" +
            "When importing guest lists, map the detected date column to `Extra field` so it becomes something like `extra.visit_date` (ISO YYYY-MM-DD)."
        );
      } else {
        parts.push(
          "Visit frequency (from guest list imports):\n" +
            `- Total visits rows: \`${freq.totalVisits}\`\n` +
            `- Unique customers: \`${freq.uniqueCustomers}\`\n` +
            `- Customers with 2+ visits: \`${freq.customersWith2PlusVisits}\`\n` +
            `- Avg visits per customer: \`${freq.avgVisitsPerCustomer.toFixed(2)}\``
        );
        if (freq.topDates.length) {
          const top = freq.topDates
            .slice(0, 6)
            .map((d) => `${d.date}: ${d.visits} visits (${d.customers} customers)`)
            .join("\n");
          parts.push(`Top visit dates:\n${top}`);
        }
      }
    }

    if (interaction) {
      parts.push(
        "Outlet interaction (co-visits by phone across imports):\n" +
          `- Customers who visited 2+ outlets: \`${interaction.customersVisitedAtLeast2Outlets}\`\n` +
          `- Top outlet pairs (phones that appear in both):`
      );
      if (interaction.topOutletPairs.length) {
        const pairs = interaction.topOutletPairs
          .map((p) => `  - ${p.outletA} + ${p.outletB}: ${p.customers} customers`)
          .join("\n");
        parts.push(pairs);
      } else {
        parts.push("  - Not enough venue/outlet data mapped yet (missing `AutomationContact.venue`).");
      }
    }

    return NextResponse.json({ message: parts.join("\n\n") });
  }

  // --- Intent 2: Automation customer counts (men/women/repeated/names/age) ---
  const isCountRequest = /\b(how\s+many|count|give\s+me|total)\b/.test(lastNt);

  // Use group context so follow-ups like "give me the count" still work.
  const wantsUniqueCustomers = isCountRequest && /\bcustomers?\b/.test(groupNt);
  const wantsNames = /\bname(s)?\b/.test(groupNt);
  const wantsAgeOnly = /\bage\b/.test(groupNt) || /\bbetween\b/.test(groupNt);
  const ageRangeOnly = wantsAgeOnly ? parseAgeRangeFromText(groupContextText) : null;
  const wantsMenCounts = /\bmen\b/.test(groupNt) || /\bmale\b/.test(groupNt);
  const wantsWomenCounts = /\bwomen\b/.test(groupNt) || /\bfemale\b/.test(groupNt);
  const wantsRepeatedCounts = /\brepeated\b/.test(groupNt) || /\brepeat(ed)?\b/.test(groupNt);

  if (isCountRequest && (wantsUniqueCustomers || wantsMenCounts || wantsWomenCounts || wantsRepeatedCounts || wantsNames || wantsAgeOnly)) {
    const [uniqueCustomersRes, genderRes, repeatedRes, nameRes, ageRes] = await Promise.all([
      wantsUniqueCustomers ? countUniqueCustomerPhones() : Promise.resolve(0),
      wantsMenCounts || wantsWomenCounts ? countGenderDistribution() : Promise.resolve({ male: 0, female: 0, genderKeyUsed: null }),
      wantsRepeatedCounts ? countRepeatedCustomersByPhone() : Promise.resolve({ repeatedUniquePhones: 0, repeatedContactRows: 0 }),
      wantsNames ? countNameStats() : Promise.resolve({ totalNamedContacts: 0, uniqueNames: 0 }),
      ageRangeOnly && wantsAgeOnly ? countContactsByAgeRange(ageRangeOnly) : Promise.resolve({ count: 0, ageKeyUsed: null }),
    ]);

    const parts: string[] = [];
    if (wantsUniqueCustomers) {
      parts.push(`Unique customers (distinct phone numbers): \`${uniqueCustomersRes}\``);
    }
    if (wantsMenCounts) {
      if (!genderRes.genderKeyUsed) parts.push(`Men count: I couldn’t detect a “gender” column in your imported data (check your Excel/PDF mapping to ` + "`extra`" + `).`);
      else parts.push(`Men: \`${genderRes.male}\` (gender field: \`${genderRes.genderKeyUsed}\`)`);
    }
    if (wantsWomenCounts) {
      if (!genderRes.genderKeyUsed) parts.push(`Women count: I couldn’t detect a “gender” column in your imported data (check your Excel/PDF mapping to ` + "`extra`" + `).`);
      else parts.push(`Women: \`${genderRes.female}\` (gender field: \`${genderRes.genderKeyUsed}\`)`);
    }
    if (wantsRepeatedCounts) {
      parts.push(
        `Repeated customers (same phone appears >= 2 times): ` +
          `\`${repeatedRes.repeatedUniquePhones}\` unique phone(s), ` +
          `\`${repeatedRes.repeatedContactRows}\` total row(s) in your imports`
      );
    }
    if (wantsNames) {
      parts.push(
        `Names: total named rows \`${nameRes.totalNamedContacts}\`, unique names (case-insensitive) \`${nameRes.uniqueNames}\``
      );
    }
    if (wantsAgeOnly) {
      if (!ageRangeOnly) {
        parts.push(`Age: tell me the range you want (example: “age between 18 and 25”).`);
      } else if (!ageRes.ageKeyUsed) {
        parts.push(`Age count: I couldn’t detect an “age” field in your imported data (check mapping to ` + "`extra`" + `).`);
      } else {
        parts.push(
          `Age match: \`${ageRes.count}\` contact row(s) in the range ${ageRangeOnly.min != null ? `>= ${ageRangeOnly.min}` : ""}${ageRangeOnly.min != null && ageRangeOnly.max != null ? " and " : ""}${ageRangeOnly.max != null ? `<= ${ageRangeOnly.max}` : ""} (age field: \`${ageRes.ageKeyUsed}\`)`
        );
      }
    }

    parts.push(`Tip: you can ask “how many men?” or “age between 20 and 30” and I’ll compute using your imported ` + "`AutomationContact.extra`" + ` + phone numbers.`);
    return NextResponse.json({ message: parts.join("\n") });
  }

  const system = [
    "You are the Bassik Admin Assistant: a concise, accurate helper for internal staff using the Bassik admin dashboard.",
    "Use the following context about the public website, venues, and admin features. It is a static snapshot from the codebase.",
    "Do not invent numbers. If you cannot determine it from context, tell the user to ask for DB stats with exact wording like “count customers / men / repeated customers” or check the admin pages.",
    "Answer in clear English. Prefer short paragraphs or bullets for operational questions.",
    "",
    "--- BEGIN SITE / PRODUCT CONTEXT ---",
    knowledge,
    "--- END SITE / PRODUCT CONTEXT ---",
  ].join("\n");

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.35,
      max_tokens: 2048,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      return NextResponse.json(
        { error: "The model returned an empty reply." },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Chat request failed.";
    console.error("[admin-assistant-chat]", e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
