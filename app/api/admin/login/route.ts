import { NextRequest, NextResponse } from "next/server";
import {
  verifyCredentials,
  createAdminToken,
  COOKIE_NAME,
} from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, password } = body;
    if (!id || !password) {
      return NextResponse.json(
        { error: "ID and password required" },
        { status: 400 }
      );
    }
    if (!verifyCredentials(id, password)) {
      return NextResponse.json(
        { error: "Invalid ID or password" },
        { status: 401 }
      );
    }
    const token = await createAdminToken();
    const res = NextResponse.json({ success: true });
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
