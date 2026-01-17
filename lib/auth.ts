// Define AdminRole type
export type AdminRole = "MAIN_ADMIN" | "ADMIN";
export const AdminRole = {
  MAIN_ADMIN: "MAIN_ADMIN" as const,
  ADMIN: "ADMIN" as const,
};

// Hardcoded admin credentials - no database required
export const HARDCODED_ADMINS = [
  {
    id: "admin-1",
    username: "bassik.in",
    password: "bassik123",
    role: "MAIN_ADMIN" as AdminRole,
    venuePermissions: [] as string[], // Empty array means all venues for MAIN_ADMIN
  },
  // Add more admins here if needed
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
