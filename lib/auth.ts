import bcrypt from "bcryptjs";
import { prisma } from "./db";

// Define AdminRole type to match Prisma enum
export type AdminRole = "MAIN_ADMIN" | "ADMIN";
export const AdminRole = {
  MAIN_ADMIN: "MAIN_ADMIN" as const,
  ADMIN: "ADMIN" as const,
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function createAdmin(
  username: string,
  password: string,
  role: AdminRole = AdminRole.ADMIN,
  createdById?: string,
  venueIds?: string[]
) {
  const hashedPassword = await hashPassword(password);
  
  const admin = await prisma.admin.create({
    data: {
      username,
      password: hashedPassword,
      role,
      createdById,
      venuePermissions: venueIds
        ? {
            create: venueIds.map((venueId) => ({ venueId })),
          }
        : undefined,
    },
    include: {
      venuePermissions: {
        include: {
          venue: true,
        },
      },
    },
  });

  return admin;
}

// Hardcoded admin credentials - no database required
const HARDCODED_ADMINS = [
  {
    id: "admin-1",
    username: "bassik.in",
    password: "bassik123",
    role: "MAIN_ADMIN" as AdminRole,
    venuePermissions: [], // Empty array means all venues for MAIN_ADMIN
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
