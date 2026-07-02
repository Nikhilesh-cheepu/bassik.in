import { NextRequest, NextResponse } from "next/server";
import {
  createKiik69AccountsToken,
  getKiik69AccountsFromRequest,
  isKiik69AccountsAuthRequired,
  KIIK69_ACCOUNTS_COOKIE,
  resolveKiik69AccountsPassword,
} from "@/lib/kiik69-auth";

export async function GET(req: NextRequest) {
  if (!isKiik69AccountsAuthRequired()) {
    return NextResponse.json({ authenticated: true, authRequired: false });
  }
  const ok = await getKiik69AccountsFromRequest(req);
  return NextResponse.json({ authenticated: ok, authRequired: true });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  if (!resolveKiik69AccountsPassword(password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  const token = await createKiik69AccountsToken();
  const res = NextResponse.json({ success: true });
  res.cookies.set(KIIK69_ACCOUNTS_COOKIE, token, {
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
  res.cookies.set(KIIK69_ACCOUNTS_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
