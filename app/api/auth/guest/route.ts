import { NextResponse } from "next/server";
import { getGuestFromCookies } from "@/lib/guest-auth";

export const runtime = "nodejs";

export async function GET() {
  const guest = await getGuestFromCookies();
  if (!guest) {
    return NextResponse.json({ guest: null });
  }
  return NextResponse.json({
    guest: { phone: guest.phone, name: guest.name, verified: true },
  });
}
