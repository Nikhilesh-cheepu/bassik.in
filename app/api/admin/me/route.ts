import { NextResponse } from "next/server";

// Simplified admin info endpoint: relies on /admin pages + middleware for auth.
export async function GET() {
  return NextResponse.json({ admin: null });
}
