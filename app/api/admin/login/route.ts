import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import { SignJWT } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "your-secret-key-change-in-production"
);

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    console.log(`[LOGIN API] Login attempt for username: ${username}`);

    if (!username || !password) {
      console.log(`[LOGIN API] Missing credentials - username: ${!!username}, password: ${!!password}`);
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    console.log(`[LOGIN API] Calling verifyAdmin for: ${username}`);
    const admin = await verifyAdmin(username, password);

    if (!admin) {
      console.log(`[LOGIN API] verifyAdmin returned null for: ${username}`);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    console.log(`[LOGIN API] Admin verified, creating JWT for: ${username}, role: ${admin.role}`);

    // Create JWT token
    const token = await new SignJWT({ id: admin.id, username: admin.username })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .sign(SECRET);

    const response = NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        venuePermissions: admin.venuePermissions,
      },
    });

    // Set HTTP-only cookie
    response.cookies.set("admin-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    console.log(`[LOGIN API] Login successful for: ${username}`);
    return response;
  } catch (error: any) {
    console.error("[LOGIN API] Login error:", error);
    console.error("[LOGIN API] Error stack:", error?.stack);
    console.error("[LOGIN API] Error code:", error?.code);
    console.error("[LOGIN API] Error message:", error?.message);
    return NextResponse.json(
      { error: "Internal server error", details: process.env.NODE_ENV === "development" ? error?.message : undefined },
      { status: 500 }
    );
  }
}
