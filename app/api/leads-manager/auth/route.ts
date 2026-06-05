import { NextRequest, NextResponse } from "next/server";
import {
  createLeadsManagerToken,
  LEADS_MANAGER_COOKIE,
  resolveLeadsManagerPassword,
} from "@/lib/leads-manager-auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  if (!resolveLeadsManagerPassword(password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  const token = await createLeadsManagerToken();
  const res = NextResponse.json({ success: true });
  res.cookies.set(LEADS_MANAGER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(LEADS_MANAGER_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
