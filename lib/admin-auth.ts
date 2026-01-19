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
  // Outlet-specific admins
  {
    id: "admin-alehouse",
    username: "alehouse",
    password: "alehouse123",
    role: "ADMIN" as const,
    venuePermissions: ["alehouse"],
  },
  {
    id: "admin-c53",
    username: "c53",
    password: "c53123",
    role: "ADMIN" as const,
    venuePermissions: ["c53"],
  },
  {
    id: "admin-boiler-room",
    username: "boilerroom",
    password: "boilerroom123",
    role: "ADMIN" as const,
    venuePermissions: ["boiler-room"],
  },
  {
    id: "admin-skyhy",
    username: "skyhy",
    password: "skyhy123",
    role: "ADMIN" as const,
    venuePermissions: ["skyhy"],
  },
  {
    id: "admin-kiik69",
    username: "kiik69",
    password: "kiik69123",
    role: "ADMIN" as const,
    venuePermissions: ["kiik69"],
  },
  {
    id: "admin-clubrogue-gachibowli",
    username: "clubrogue-gachibowli",
    password: "clubrogue-gb123",
    role: "ADMIN" as const,
    venuePermissions: ["club-rogue-gachibowli"],
  },
  {
    id: "admin-clubrogue-kondapur",
    username: "clubrogue-kondapur",
    password: "clubrogue-kp123",
    role: "ADMIN" as const,
    venuePermissions: ["club-rogue-kondapur"],
  },
  {
    id: "admin-clubrogue-jublieehills",
    username: "clubrogue-jublieehills",
    password: "clubrogue-jh123",
    role: "ADMIN" as const,
    venuePermissions: ["club-rogue-jubilee-hills"],
  },
  {
    id: "admin-sound-of-soul",
    username: "soundofsoul",
    password: "soundofsoul123",
    role: "ADMIN" as const,
    venuePermissions: ["sound-of-soul"],
  },
  {
    id: "admin-rejoy",
    username: "rejoy",
    password: "rejoy123",
    role: "ADMIN" as const,
    venuePermissions: ["rejoy"],
  },
  {
    id: "admin-firefly",
    username: "firefly",
    password: "firefly123",
    role: "ADMIN" as const,
    venuePermissions: ["firefly"],
  },
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
