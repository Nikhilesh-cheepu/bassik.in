import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "your-secret-key-change-in-production"
);

// Hardcoded admin credentials - matching lib/auth.ts
const HARDCODED_ADMINS = [
  {
    id: "admin-1",
    username: "bassik.in",
    password: "bassik123",
    role: "MAIN_ADMIN" as const,
    venuePermissions: [], // Empty array means all venues for MAIN_ADMIN
  },
  // Add more admins here if needed
];

export async function verifyAdminToken(request: NextRequest) {
  try {
    const token = request.cookies.get("admin-token")?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, SECRET);
    const adminId = (payload as { id: string }).id;
    const username = (payload as { username?: string }).username;

    // Find admin from hardcoded list using ID or username
    const admin = HARDCODED_ADMINS.find(
      (a) => a.id === adminId || a.username === username
    );

    if (!admin) {
      return null;
    }

    return {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      venuePermissions: admin.venuePermissions as string[],
    };
  } catch (error) {
    console.error("Error verifying admin token:", error);
    return null;
  }
}

export async function canAccessVenue(
  admin: { role: string; venuePermissions: string[] },
  brandId: string
): Promise<boolean> {
  // Main admin can access all venues
  if (admin.role === "MAIN_ADMIN") {
    return true;
  }

  // Regular admin can only access venues they have permission for
  return admin.venuePermissions.includes(brandId);
}
