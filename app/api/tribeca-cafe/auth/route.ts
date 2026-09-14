import { NextRequest, NextResponse } from "next/server";
import {
  TRIBECA_COOKIE,
  createTribecaToken,
  getTribecaFromRequest,
  isTribecaAuthRequired,
  resolveTribecaLogin,
} from "@/lib/tribeca-auth";

export async function GET(req: NextRequest) {
  if (!isTribecaAuthRequired()) {
    return NextResponse.json({ authenticated: true, authRequired: false, role: "bassik" });
  }
  const session = await getTribecaFromRequest(req);
  return NextResponse.json({
    authenticated: Boolean(session),
    authRequired: true,
    role: session?.role ?? null,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  const role = resolveTribecaLogin(password);
  if (!role) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  const token = await createTribecaToken(role);
  const res = NextResponse.json({ success: true, role });
  res.cookies.set(TRIBECA_COOKIE, token, {
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
  res.cookies.set(TRIBECA_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
