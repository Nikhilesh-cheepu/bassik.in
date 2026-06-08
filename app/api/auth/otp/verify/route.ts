import { NextRequest, NextResponse } from "next/server";
import { normalizeGuestPhone } from "@/lib/guest-phone";
import {
  createGuestToken,
  linkChatLeadToGuest,
  setGuestCookie,
  upsertVerifiedGuest,
} from "@/lib/guest-auth";
import { msg91VerifyOtp } from "@/lib/msg91-otp";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      phone?: string;
      otp?: string;
      name?: string;
      leadId?: string;
    };

    const phone = normalizeGuestPhone(body.phone);
    const otp = String(body.otp ?? "").trim();
    if (!phone) {
      return NextResponse.json({ error: "Invalid mobile number" }, { status: 400 });
    }

    const verified = await msg91VerifyOtp(phone, otp);
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 400 });
    }

    const guest = await upsertVerifiedGuest(phone, body.name);
    await linkChatLeadToGuest(body.leadId, guest);

    const token = await createGuestToken(guest);
    const res = NextResponse.json({
      ok: true,
      guest: { phone: guest.phone, name: guest.name },
    });
    setGuestCookie(res, token);
    return res;
  } catch (e) {
    console.error("[auth/otp/verify]", e);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
