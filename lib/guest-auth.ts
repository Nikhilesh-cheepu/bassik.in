import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeGuestPhone } from "@/lib/guest-phone";

export const GUEST_COOKIE = "bassik_guest";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const JWT_SECRET = new TextEncoder().encode(
  process.env.GUEST_SESSION_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    "dev-guest-secret-change-in-production"
);

export type GuestSession = {
  guestId: string;
  phone: string;
  name: string | null;
};

export async function upsertVerifiedGuest(phone10: string, name?: string | null): Promise<GuestSession> {
  const phone = normalizeGuestPhone(phone10);
  if (!phone) throw new Error("Invalid phone");

  const cleanName = name?.trim().slice(0, 80) || null;
  const now = new Date();

  const guest = await prisma.guest.upsert({
    where: { phone },
    create: { phone, name: cleanName, verifiedAt: now, lastSeenAt: now },
    update: {
      lastSeenAt: now,
      verifiedAt: now,
      ...(cleanName ? { name: cleanName } : {}),
    },
  });

  return { guestId: guest.id, phone: guest.phone, name: guest.name };
}

export async function createGuestToken(session: GuestSession): Promise<string> {
  return new SignJWT({ phone: session.phone, name: session.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.guestId)
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(JWT_SECRET);
}

export async function verifyGuestToken(token: string): Promise<GuestSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const guestId = typeof payload.sub === "string" ? payload.sub : null;
    const phone = typeof payload.phone === "string" ? payload.phone : null;
    if (!guestId || !phone) return null;
    const name = typeof payload.name === "string" ? payload.name : null;
    return { guestId, phone, name };
  } catch {
    return null;
  }
}

export async function getGuestFromCookies(): Promise<GuestSession | null> {
  const jar = await cookies();
  const token = jar.get(GUEST_COOKIE)?.value;
  if (!token) return null;
  return verifyGuestToken(token);
}

export async function getGuestFromRequest(req: NextRequest): Promise<GuestSession | null> {
  const token = req.cookies.get(GUEST_COOKIE)?.value;
  if (!token) return null;
  return verifyGuestToken(token);
}

export function setGuestCookie(res: NextResponse, token: string) {
  res.cookies.set(GUEST_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export function clearGuestCookie(res: NextResponse) {
  res.cookies.set(GUEST_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
}

/** Link chat lead to verified guest after OTP. */
export async function linkChatLeadToGuest(leadId: string | null | undefined, guest: GuestSession) {
  if (!leadId) return;
  await prisma.venueChatLead.updateMany({
    where: { id: leadId },
    data: { guestId: guest.guestId, phoneVerifiedAt: new Date(), contactNumber: guest.phone },
  });
}
