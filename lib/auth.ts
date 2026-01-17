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
    const admin = await prisma.admin.findUnique({
      where: { username },
      include: {
        venuePermissions: {
          include: {
            venue: true,
          },
        },
      },
    });

    if (!admin) {
      console.log(`Admin not found: ${username}`);
      return null;
    }

    // Check if admin is active (only if active field exists and is false, otherwise allow)
    // Use type assertion to safely check active field
    const adminData = admin as any;
    if (adminData.active === false) {
      console.log(`Admin is inactive: ${username}`);
      return null;
    }

    const isValid = await verifyPassword(password, admin.password);
    if (!isValid) {
      console.log(`Invalid password for admin: ${username}`);
      return null;
    }

    return {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      venuePermissions: admin.venuePermissions.map((p: { venue: { brandId: string } }) => p.venue.brandId),
    };
  } catch (error) {
    console.error("Error verifying admin:", error);
    return null;
  }
}
