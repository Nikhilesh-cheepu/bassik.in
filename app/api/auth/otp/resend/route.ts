import { NextRequest, NextResponse } from "next/server";
import { normalizeGuestPhone } from "@/lib/guest-phone";
import { msg91ResendOtp } from "@/lib/msg91-otp";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { phone?: string };
    const phone = normalizeGuestPhone(body.phone);
    if (!phone) {
      return NextResponse.json({ error: "Invalid mobile number" }, { status: 400 });
    }

    const result = await msg91ResendOtp(phone);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[auth/otp/resend]", e);
    return NextResponse.json({ error: "Could not resend OTP" }, { status: 500 });
  }
}
