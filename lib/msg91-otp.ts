import { guestPhoneForMsg91, normalizeGuestPhone } from "@/lib/guest-phone";

export type Msg91SendResult = { ok: true } | { ok: false; error: string };

export type Msg91VerifyResult = { ok: true } | { ok: false; error: string };

function authKey(): string | null {
  return process.env.MSG91_AUTH_KEY?.trim() || process.env.MSG91_AUTHKEY?.trim() || null;
}

function templateId(): string | null {
  return process.env.MSG91_OTP_TEMPLATE_ID?.trim() || null;
}

function mockEnabled(): boolean {
  if (process.env.MSG91_OTP_MOCK === "true") return true;
  if (process.env.NODE_ENV === "development" && !authKey()) return true;
  return false;
}

/** Send OTP via MSG91 SendOTP v5 API. */
export async function msg91SendOtp(phone10: string): Promise<Msg91SendResult> {
  const phone = normalizeGuestPhone(phone10);
  if (!phone) return { ok: false, error: "Invalid mobile number" };

  if (mockEnabled()) {
    console.info(`[msg91-otp] MOCK OTP for ${phone}: 123456`);
    return { ok: true };
  }

  const key = authKey();
  const template = templateId();
  if (!key) return { ok: false, error: "SMS service not configured" };
  if (!template) return { ok: false, error: "OTP template not configured" };

  const mobile = guestPhoneForMsg91(phone);
  const url = new URL("https://control.msg91.com/api/v5/otp");
  url.searchParams.set("template_id", template);
  url.searchParams.set("mobile", mobile);
  url.searchParams.set("otp_length", "6");
  url.searchParams.set("otp_expiry", "10");

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { authkey: key, "Content-Type": "application/json" },
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("[msg91-otp] send failed", res.status, text);
      return { ok: false, error: "Could not send OTP. Try again in a moment." };
    }
    return { ok: true };
  } catch (e) {
    console.error("[msg91-otp] send error", e);
    return { ok: false, error: "Could not send OTP. Check your connection." };
  }
}

/** Verify OTP via MSG91. */
export async function msg91VerifyOtp(phone10: string, otp: string): Promise<Msg91VerifyResult> {
  const phone = normalizeGuestPhone(phone10);
  if (!phone) return { ok: false, error: "Invalid mobile number" };

  const code = otp.replace(/\D/g, "").slice(0, 6);
  if (code.length !== 6) return { ok: false, error: "Enter the 6-digit code" };

  if (mockEnabled()) {
    if (code === "123456") return { ok: true };
    return { ok: false, error: "Incorrect code. Use 123456 in dev mode." };
  }

  const key = authKey();
  if (!key) return { ok: false, error: "SMS service not configured" };

  const mobile = guestPhoneForMsg91(phone);
  const url = new URL("https://control.msg91.com/api/v5/otp/verify");
  url.searchParams.set("mobile", mobile);
  url.searchParams.set("otp", code);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { authkey: key },
    });
    const text = await res.text();
    let parsed: { type?: string; message?: string } = {};
    try {
      parsed = JSON.parse(text) as { type?: string; message?: string };
    } catch {
      /* legacy plain text */
    }
    const success =
      res.ok &&
      (parsed.type === "success" ||
        /verified|success/i.test(parsed.message ?? "") ||
        /verified|success/i.test(text));
    if (!success) {
      return { ok: false, error: "Incorrect or expired code" };
    }
    return { ok: true };
  } catch (e) {
    console.error("[msg91-otp] verify error", e);
    return { ok: false, error: "Verification failed. Try again." };
  }
}

/** Resend OTP (text). */
export async function msg91ResendOtp(phone10: string): Promise<Msg91SendResult> {
  const phone = normalizeGuestPhone(phone10);
  if (!phone) return { ok: false, error: "Invalid mobile number" };

  if (mockEnabled()) {
    console.info(`[msg91-otp] MOCK resend for ${phone}: 123456`);
    return { ok: true };
  }

  const key = authKey();
  if (!key) return { ok: false, error: "SMS service not configured" };

  const mobile = guestPhoneForMsg91(phone);
  const url = new URL("https://control.msg91.com/api/v5/otp/retry");
  url.searchParams.set("mobile", mobile);
  url.searchParams.set("retrytype", "text");

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { authkey: key },
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[msg91-otp] resend failed", res.status, text);
      return { ok: false, error: "Could not resend OTP yet. Wait a few seconds." };
    }
    return { ok: true };
  } catch (e) {
    console.error("[msg91-otp] resend error", e);
    return { ok: false, error: "Could not resend OTP." };
  }
}
