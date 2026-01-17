import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "./db";
import { AdminRole } from "./auth";

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "your-secret-key-change-in-production"
);

export async function verifyAdminToken(request: NextRequest) {
  try {
    const token = request.cookies.get("admin-token")?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, SECRET);
    const adminId = (payload as { id: string }).id;

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      include: {
        venuePermissions: {
          include: {
            venue: true,
          },
        },
      },
    });

    if (!admin) {
      return null;
    }

    return {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      venuePermissions: admin.venuePermissions.map((p) => p.venue.brandId),
    };
  } catch (error) {
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
