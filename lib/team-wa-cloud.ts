/**
 * Meta WhatsApp Cloud API — direct send (no Interakt).
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

export type WaCloudSendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string; skipped?: boolean };

export function isWhatsAppCloudConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_CLOUD_TOKEN?.trim() &&
      process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim()
  );
}

export function designerWaPhone(assigneeId: string): string | null {
  const raw = process.env.TEAM_DESIGNER_WA_PHONES?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const v = parsed[assigneeId];
    if (typeof v !== "string") return null;
    const digits = v.replace(/\D/g, "");
    if (digits.length < 10) return null;
    // Prefer 91… for India if 10-digit local
    if (digits.length === 10) return `91${digits}`;
    return digits;
  } catch {
    return null;
  }
}

export function whatsAppShareUrl(phoneDigits: string | null, text: string): string {
  const q = encodeURIComponent(text);
  if (phoneDigits) {
    return `https://api.whatsapp.com/send?phone=${phoneDigits}&text=${q}`;
  }
  return `https://api.whatsapp.com/send?text=${q}`;
}

async function graphSend(body: Record<string, unknown>): Promise<WaCloudSendResult> {
  const token = process.env.WHATSAPP_CLOUD_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneId) {
    return { ok: false, error: "WhatsApp Cloud API not configured", skipped: true };
  }

  const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string };
    };
    if (!res.ok) {
      return {
        ok: false,
        error: data.error?.message?.slice(0, 240) || `HTTP ${res.status}`,
      };
    }
    const messageId = data.messages?.[0]?.id?.trim() || "ok";
    return { ok: true, messageId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message.slice(0, 240) : "Send failed",
    };
  }
}

/** Send a pre-approved utility template (business-initiated). */
export async function sendWhatsAppCloudTemplate(params: {
  toPhone: string;
  templateName: string;
  languageCode?: string;
  bodyParams: string[];
}): Promise<WaCloudSendResult> {
  const to = params.toPhone.replace(/\D/g, "");
  if (!to) return { ok: false, error: "Invalid phone" };

  const components =
    params.bodyParams.length > 0
      ? [
          {
            type: "body",
            parameters: params.bodyParams.map((text) => ({
              type: "text",
              text: text.slice(0, 1024) || "-",
            })),
          },
        ]
      : undefined;

  return graphSend({
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: params.templateName,
      language: { code: params.languageCode || "en" },
      ...(components ? { components } : {}),
    },
  });
}

/**
 * Session text message (only works inside 24h customer window).
 * Used when no template is configured, or as secondary attempt.
 */
export async function sendWhatsAppCloudText(params: {
  toPhone: string;
  body: string;
}): Promise<WaCloudSendResult> {
  const to = params.toPhone.replace(/\D/g, "");
  if (!to) return { ok: false, error: "Invalid phone" };
  return graphSend({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { preview_url: false, body: params.body.slice(0, 4096) },
  });
}

/** Prefer template when set; else text. */
export async function sendDesignerWhatsApp(params: {
  assigneeId: string;
  body: string;
  /** Short lines for template vars: [name, summary, jobList] */
  templateParams?: [string, string, string];
}): Promise<WaCloudSendResult & { shareUrl: string; phone: string | null }> {
  const phone = designerWaPhone(params.assigneeId);
  const shareUrl = whatsAppShareUrl(phone, params.body);

  if (!phone) {
    return {
      ok: false,
      error: "No phone for designer",
      skipped: true,
      shareUrl,
      phone: null,
    };
  }
  if (!isWhatsAppCloudConfigured()) {
    return {
      ok: false,
      error: "WhatsApp Cloud API not configured",
      skipped: true,
      shareUrl,
      phone,
    };
  }

  const template = process.env.TEAM_WA_TEMPLATE_DESIGNER_NUDGE?.trim();
  const lang = process.env.TEAM_WA_TEMPLATE_LANGUAGE?.trim() || "en";

  if (template && params.templateParams) {
    const result = await sendWhatsAppCloudTemplate({
      toPhone: phone,
      templateName: template,
      languageCode: lang,
      bodyParams: [...params.templateParams],
    });
    return { ...result, shareUrl, phone };
  }

  const result = await sendWhatsAppCloudText({ toPhone: phone, body: params.body });
  return { ...result, shareUrl, phone };
}
