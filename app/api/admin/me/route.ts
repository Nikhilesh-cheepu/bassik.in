import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return Clerk user info in a format compatible with existing admin structure
    return NextResponse.json({
      admin: {
        id: user.id,
        username: user.username || user.emailAddresses[0]?.emailAddress || user.id,
        email: user.emailAddresses[0]?.emailAddress,
        role: "ADMIN", // You can customize this based on Clerk metadata
        venuePermissions: [], // You can customize this based on Clerk metadata
      },
    });
  } catch (error) {
    console.error("Error fetching admin user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
