import { NextRequest, NextResponse } from "next/server";
import {
  resolveAdminPasscode,
  createAdminToken,
  loginRedirectForScope,
  COOKIE_NAME,
} from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;
    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Passcode required" },
        { status: 400 }
      );
    }
    const scope = resolveAdminPasscode(password.trim());
    if (!scope) {
      return NextResponse.json(
        { error: "Invalid passcode" },
        { status: 401 }
      );
    }
    const token = await createAdminToken(scope);
    const redirectTo = loginRedirectForScope(scope);
    const res = NextResponse.json({ success: true, redirectTo });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24h
      path: "/",
    });
    return res;
  } catch (e) {
    console.error("[admin login]", e);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
