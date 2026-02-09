import { NextRequest, NextResponse } from "next/server";

// GET - Get all Clerk admin users (users with admin role in metadata)
// NOTE: This endpoint is intentionally simple and returns an empty list.
// Admins are managed via Clerk Dashboard metadata; API auth is enforced in /admin pages.
export async function GET(request: NextRequest) {
  return NextResponse.json({ admins: [] });
}

// POST - Not supported (admins are managed in Clerk Dashboard)
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: "Admin creation is not supported via API. Admins are managed in Clerk Dashboard by setting role in user metadata." },
    { status: 405 }
  );
}

// PATCH - Not supported (admins are managed in Clerk Dashboard)
export async function PATCH(request: NextRequest) {
  return NextResponse.json(
    { error: "Admin updates are not supported via API. Admins are managed in Clerk Dashboard by setting role in user metadata." },
    { status: 405 }
  );
}
