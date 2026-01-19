// Define AdminRole type
export type AdminRole = "MAIN_ADMIN" | "ADMIN";
export const AdminRole = {
  MAIN_ADMIN: "MAIN_ADMIN" as const,
  ADMIN: "ADMIN" as const,
};

// Hardcoded admin credentials - no database required
// MAIN ADMIN: full access (all venues)
// SUB ADMINS: outlet-specific access only
export const HARDCODED_ADMINS = [
  {
    id: "admin-1",
    username: "bassik.in",
    password: "bassik123",
    role: "MAIN_ADMIN" as AdminRole,
    venuePermissions: [] as string[], // Empty array means all venues for MAIN_ADMIN
  },
  // Outlet-specific admins
  {
    id: "admin-alehouse",
    username: "alehouse",
    password: "alehouse123",
    role: "ADMIN" as AdminRole,
    venuePermissions: ["alehouse"],
  },
  {
    id: "admin-c53",
    username: "c53",
    password: "c53123",
    role: "ADMIN" as AdminRole,
    venuePermissions: ["c53"],
  },
  {
    id: "admin-boiler-room",
    username: "boilerroom",
    password: "boilerroom123",
    role: "ADMIN" as AdminRole,
    venuePermissions: ["boiler-room"],
  },
  {
    id: "admin-skyhy",
    username: "skyhy",
    password: "skyhy123",
    role: "ADMIN" as AdminRole,
    venuePermissions: ["skyhy"],
  },
  {
    id: "admin-kiik69",
    username: "kiik69",
    password: "kiik69123",
    role: "ADMIN" as AdminRole,
    venuePermissions: ["kiik69"],
  },
  {
    id: "admin-clubrogue-gachibowli",
    username: "clubrogue-gachibowli",
    password: "clubrogue-gb123",
    role: "ADMIN" as AdminRole,
    venuePermissions: ["club-rogue-gachibowli"],
  },
  {
    id: "admin-clubrogue-kondapur",
    username: "clubrogue-kondapur",
    password: "clubrogue-kp123",
    role: "ADMIN" as AdminRole,
    venuePermissions: ["club-rogue-kondapur"],
  },
  {
    id: "admin-clubrogue-jublieehills",
    username: "clubrogue-jublieehills",
    password: "clubrogue-jh123",
    role: "ADMIN" as AdminRole,
    venuePermissions: ["club-rogue-jubilee-hills"],
  },
  {
    id: "admin-sound-of-soul",
    username: "soundofsoul",
    password: "soundofsoul123",
    role: "ADMIN" as AdminRole,
    venuePermissions: ["sound-of-soul"],
  },
  {
    id: "admin-rejoy",
    username: "rejoy",
    password: "rejoy123",
    role: "ADMIN" as AdminRole,
    venuePermissions: ["rejoy"],
  },
  {
    id: "admin-firefly",
    username: "firefly",
    password: "firefly123",
    role: "ADMIN" as AdminRole,
    venuePermissions: ["firefly"],
  },
];

export async function verifyAdmin(username: string, password: string) {
  try {
    console.log(`[VERIFY] Starting verification for username: ${username}`);
    
    // Check hardcoded admins
    const admin = HARDCODED_ADMINS.find((a) => a.username === username);

    if (!admin) {
      console.log(`[VERIFY] Admin not found: ${username}`);
      return null;
    }

    console.log(`[VERIFY] Admin found - Username: ${admin.username}, Role: ${admin.role}`);

    // Simple password comparison (no bcrypt needed for hardcoded)
    if (password !== admin.password) {
      console.log(`[VERIFY] Password verification failed for: ${username}`);
      return null;
    }

    console.log(`[VERIFY] Login successful for: ${username}`);
    return {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      venuePermissions: admin.venuePermissions,
    };
  } catch (error: any) {
    console.error(`[VERIFY] Error verifying admin for ${username}:`, {
      message: error?.message,
    });
    return null;
  }
}
