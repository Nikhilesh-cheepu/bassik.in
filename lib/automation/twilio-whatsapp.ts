import { toTwilioWhatsAppAddress } from "./phone";

export type TwilioSendResult =
  | { ok: true; sid: string }
  | { ok: false; error: string; code?: number };

/** Short hint for admins when Twilio rejects a WhatsApp send. */
export function twilioWhatsAppErrorHint(code?: number): string | undefined {
  switch (code) {
    case 63016:
      return "Sandbox: the recipient must send Twilio’s join phrase to the sandbox WhatsApp number from that phone first. Production: you may need an approved WhatsApp template or an open 24h reply window.";
    case 21610:
      return "Often means the recipient is not allowed for this sender yet (e.g. sandbox not joined). In Twilio Console → Messaging → Try WhatsApp, copy the join code and WhatsApp it to the sandbox number from the test handset.";
    case 21211:
    case 21614:
      return "Use a valid international number (10-digit India numbers are saved as +91… automatically; you can also type +917013884485 explicitly).";
    case 63007:
      return "Check TWILIO_WHATSAPP_FROM matches your Twilio WhatsApp sender (sandbox line or approved business number).";
    default:
      return undefined;
  }
}

function formatWhatsAppFromEnv(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("whatsapp:")) return t;
  if (t.startsWith("+")) return `whatsapp:${t}`;
  const digits = t.replace(/\D/g, "");
  if (!digits) return t;
  return `whatsapp:+${digits}`;
}

export async function sendTwilioWhatsAppMessage(
  toE164OrRaw: string,
  body: string
): Promise<TwilioSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromRaw = process.env.TWILIO_WHATSAPP_FROM?.trim();

  if (!accountSid || !authToken || !fromRaw) {
    return {
      ok: false,
      error:
        "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM (e.g. whatsapp:+14155238886 for sandbox).",
    };
  }

  const toAddr = toTwilioWhatsAppAddress(toE164OrRaw);
  if (!toAddr || !toAddr.startsWith("whatsapp:+")) {
    return { ok: false, error: "Invalid recipient phone number." };
  }

  const from = formatWhatsAppFromEnv(fromRaw);
  if (!from.startsWith("whatsapp:+")) {
    return { ok: false, error: "TWILIO_WHATSAPP_FROM must be a WhatsApp-enabled Twilio number." };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const params = new URLSearchParams();
  params.set("From", from);
  params.set("To", toAddr);
  params.set("Body", body.slice(0, 1600));

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  let data: {
    sid?: string;
    message?: string;
    code?: number;
    error_message?: string;
    more_info?: string;
    status?: number;
  };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    return {
      ok: false,
      error: `Twilio returned HTTP ${res.status} (could not parse response).`,
    };
  }

  if (!res.ok) {
    const base = data.message || data.error_message || `Twilio HTTP ${res.status}`;
    const codePart = data.code != null ? ` [Twilio ${data.code}]` : "";
    const link = data.more_info ? ` ${data.more_info}` : "";
    return {
      ok: false,
      error: `${base}${codePart}${link}`.trim(),
      code: data.code,
    };
  }

  if (!data.sid) {
    return { ok: false, error: "Twilio returned no message SID." };
  }

  return { ok: true, sid: data.sid };
}
