import { NextRequest, NextResponse } from "next/server";
import {
  createTeamToken,
  getTeamFromRequest,
  resolveTeamLogin,
  TEAM_COOKIE,
} from "@/lib/team-auth";

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ user: session });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  const session = resolveTeamLogin(password);
  if (!session) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  const token = await createTeamToken(session);
  const res = NextResponse.json({ success: true, user: session });
  res.cookies.set(TEAM_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 14,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(TEAM_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
