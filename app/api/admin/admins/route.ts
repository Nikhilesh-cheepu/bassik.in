import { NextRequest, NextResponse } from "next/server";

// GET - List admins (single admin login; returns empty list for compatibility)
export async function GET(request: NextRequest) {
  return NextResponse.json({ admins: [] });
}

// POST - Not supported
export async function POST(request: NextRequest) {
  return NextResponse.json({ error: "Admin creation is not supported via API." }, { status: 405 });
}

// PATCH - Not supported
export async function PATCH(request: NextRequest) {
  return NextResponse.json({ error: "Admin updates are not supported via API." }, { status: 405 });
}
