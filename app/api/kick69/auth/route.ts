import { NextRequest, NextResponse } from "next/server";
import {
  createKick69AccountsToken,
  getKick69AccountsFromRequest,
  KICK69_ACCOUNTS_COOKIE,
  resolveKick69AccountsPassword,
} from "@/lib/kick69-auth";

export async function GET(req: NextRequest) {
  const ok = await getKick69AccountsFromRequest(req);
  return NextResponse.json({ authenticated: ok });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  if (!resolveKick69AccountsPassword(password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  const token = await createKick69AccountsToken();
  const res = NextResponse.json({ success: true });
  res.cookies.set(KICK69_ACCOUNTS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(KICK69_ACCOUNTS_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
