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
    
    // Try to query admin - make it resilient to missing relations
    let admin: any;
    let venuePermissions: string[] = [];
    
    try {
      admin = await prisma.admin.findUnique({
        where: { username },
        include: {
          venuePermissions: {
            include: {
              venue: {
                select: {
                  brandId: true,
                },
              },
            },
          },
        },
      });
      console.log(`[VERIFY] Admin query completed. Found: ${!!admin}`);
      
      if (admin && admin.venuePermissions) {
        venuePermissions = admin.venuePermissions.map((p: any) => {
          if (p?.venue?.brandId) {
            return p.venue.brandId;
          }
          if (p?.venueId) {
            return p.venueId;
          }
          return null;
        }).filter((id: string | null) => id !== null) as string[];
      }
    } catch (dbError: any) {
      console.error(`[VERIFY] Database query error:`, {
        code: dbError?.code,
        message: dbError?.message,
        stack: dbError?.stack?.substring(0, 500),
      });
      
      // Try simpler query if the complex one fails
      try {
        console.log(`[VERIFY] Attempting simpler query without includes`);
        admin = await prisma.admin.findUnique({
          where: { username },
          select: {
            id: true,
            username: true,
            password: true,
            role: true,
          },
        });
        venuePermissions = []; // Empty permissions for simpler query
        console.log(`[VERIFY] Simple query completed. Found: ${!!admin}`);
      } catch (simpleError: any) {
        console.error(`[VERIFY] Simple query also failed:`, simpleError?.message);
        throw simpleError;
      }
    }

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
    console.log(`[VERIFY] Login successful for: ${username}, permissions: ${venuePermissions.length} venues`);

    console.log(`[VERIFY] Login successful for: ${username}, permissions: ${venuePermissions.length} venues`);
    return {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      venuePermissions,
    };
  } catch (error: any) {
    console.error(`[VERIFY] Error verifying admin for ${username}:`, {
      message: error?.message,
      code: error?.code,
      stack: error?.stack?.substring(0, 500),
    });
    return null;
  }
}
