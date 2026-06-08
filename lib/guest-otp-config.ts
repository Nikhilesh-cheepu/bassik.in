/** OTP is opt-in until MSG91 + DLT are live. Do not gate bookings by default. */

function smsCredentialsConfigured(): boolean {
  const key = process.env.MSG91_AUTH_KEY?.trim() || process.env.MSG91_AUTHKEY?.trim();
  const template = process.env.MSG91_OTP_TEMPLATE_ID?.trim();
  return Boolean(key && template);
}

/** API / server — requires MSG91_OTP_REQUIRED=true and SMS env vars. */
export function isGuestOtpRequiredOnServer(): boolean {
  if (process.env.MSG91_OTP_REQUIRED !== "true") return false;
  return smsCredentialsConfigured();
}

/** Client UI — set NEXT_PUBLIC_MSG91_OTP_REQUIRED=true when enabling SMS on the site. */
export function isGuestOtpRequiredOnClient(): boolean {
  return process.env.NEXT_PUBLIC_MSG91_OTP_REQUIRED === "true";
}
