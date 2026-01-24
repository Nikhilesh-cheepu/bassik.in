import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

// GET - Get all Clerk admin users (users with admin role in metadata)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin role
    const user = await currentUser();
    const role = user?.publicMetadata?.role as string;
    if (role !== "admin" && role !== "main_admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    // Note: Clerk admins are managed via Clerk Dashboard metadata
    // This endpoint is kept for compatibility but returns empty array
    // Admins should be managed in Clerk Dashboard by setting role in user metadata
    return NextResponse.json({ admins: [] });
  } catch (error) {
    console.error("Error fetching admins:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
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
