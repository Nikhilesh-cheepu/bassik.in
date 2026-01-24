import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { HARDCODED_ADMINS } from "@/lib/auth";

// GET - Get all hardcoded admins (only MAIN_ADMIN)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For now, all authenticated Clerk users can see admins
    // You can add role-based checks using Clerk metadata if needed

    // Return hardcoded admins with formatted structure
    const admins = HARDCODED_ADMINS.map((a) => ({
      id: a.id,
      username: a.username,
      role: a.role,
      active: true, // All hardcoded admins are active
      venuePermissions: a.venuePermissions.map((venueId) => ({
        venue: {
          brandId: venueId,
          name: venueId,
          shortName: venueId,
        },
      })),
      createdAt: new Date().toISOString(),
    }));

    return NextResponse.json({ admins });
  } catch (error) {
    console.error("Error fetching admins:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Not supported (admins are hardcoded in code)
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: "Admin creation is not supported. Admins are managed in code." },
    { status: 405 }
  );
}

// PATCH - Not supported (admins are hardcoded in code)
export async function PATCH(request: NextRequest) {
  return NextResponse.json(
    { error: "Admin updates are not supported. Admins are managed in code." },
    { status: 405 }
  );
}
