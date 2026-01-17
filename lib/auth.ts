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

export async function verifyAdmin(username: string, password: string) {
  try {
    console.log(`[VERIFY] Starting verification for username: ${username}`);
    
    // Start with simplest query - just get admin credentials, no relations
    // This avoids any issues with venuePermissions or venue relations
    let admin: any;
    let venuePermissions: string[] = [];
    
    console.log(`[VERIFY] Querying admin from database...`);
    admin = await prisma.admin.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        password: true,
        role: true,
      },
    });
    
    console.log(`[VERIFY] Basic admin query completed. Found: ${!!admin}`);

    if (!admin) {
      console.log(`[VERIFY] Admin not found in database: ${username}`);
      return null;
    }

    console.log(`[VERIFY] Admin found - ID: ${admin.id}, Role: ${admin.role}`);

    // Check if admin is active (only if active field exists and is false, otherwise allow)
    // This handles the case where the migration hasn't been run yet
    const adminData = admin as any;
    if (adminData.active !== undefined && adminData.active === false) {
      console.log(`[VERIFY] Admin is marked as inactive: ${username}`);
      return null;
    }

    console.log(`[VERIFY] Verifying password for: ${username}`);
    const isValid = await verifyPassword(password, admin.password);
    if (!isValid) {
      console.log(`[VERIFY] Password verification failed for: ${username}`);
      return null;
    }

    console.log(`[VERIFY] Password verified successfully for: ${username}`);
    
    // Get venue permissions separately to avoid include issues
    if (!venuePermissions.length) {
      try {
        const permissions = await prisma.adminVenuePermission.findMany({
          where: { adminId: admin.id },
          include: {
            venue: {
              select: { brandId: true },
            },
          },
        });
        venuePermissions = permissions
          .map((p: any) => p?.venue?.brandId || p?.venueId)
          .filter((id: string | null | undefined) => id != null) as string[];
      } catch (permError: any) {
        console.log(`[VERIFY] Could not fetch permissions (non-fatal):`, permError?.code);
        venuePermissions = [];
      }
    }

    console.log(`[VERIFY] Login successful for: ${username}, permissions: ${venuePermissions.length} venues`);
    return {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      venuePermissions,
    };
  } catch (error: any) {
    console.error(`[VERIFY] CRITICAL ERROR verifying admin for ${username}:`, {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      meta: error?.meta,
    });
    // Don't swallow the error - let it propagate so API can handle it
    throw error;
  }
}
