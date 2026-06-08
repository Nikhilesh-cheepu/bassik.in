import { NextRequest, NextResponse } from "next/server";
import { normalizeGuestPhone } from "@/lib/guest-phone";
import { msg91SendOtp } from "@/lib/msg91-otp";

export const runtime = "nodejs";

const sendCooldown = new Map<string, number>();
const COOLDOWN_MS = 30_000;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { phone?: string };
    const phone = normalizeGuestPhone(body.phone);
    if (!phone) {
      return NextResponse.json({ error: "Enter a valid 10-digit mobile number" }, { status: 400 });
    }

    const last = sendCooldown.get(phone) ?? 0;
    if (Date.now() - last < COOLDOWN_MS) {
      const wait = Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 1000);
      return NextResponse.json({ error: `Please wait ${wait}s before requesting another code` }, { status: 429 });
    }

    const result = await msg91SendOtp(phone);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    sendCooldown.set(phone, Date.now());
    return NextResponse.json({ ok: true, phone });
  } catch (e) {
    console.error("[auth/otp/send]", e);
    return NextResponse.json({ error: "Could not send OTP" }, { status: 500 });
  }
}
