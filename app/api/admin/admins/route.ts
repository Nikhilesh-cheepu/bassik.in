import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAdminToken, canAccessVenue } from "@/lib/admin-auth";
import { createAdmin, AdminRole } from "@/lib/auth";

// GET - Get all admins (only MAIN_ADMIN)
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (admin.role !== "MAIN_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admins = await prisma.admin.findMany({
      include: {
        venuePermissions: {
          include: {
            venue: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: [
        { active: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ admins });
  } catch (error) {
    console.error("Error fetching admins:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new admin (only MAIN_ADMIN)
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (admin.role !== "MAIN_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, role, venueIds } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const adminRole = role === "MAIN_ADMIN" ? "MAIN_ADMIN" : "ADMIN";

    // If creating a regular admin, venueIds are required
    if (adminRole === "ADMIN" && (!venueIds || venueIds.length === 0)) {
      return NextResponse.json(
        { error: "Venue permissions are required for regular admins" },
        { status: 400 }
      );
    }

    const newAdmin = await createAdmin(username, password, adminRole, admin.id, venueIds);

    return NextResponse.json({
      admin: {
        id: newAdmin.id,
        username: newAdmin.username,
        role: newAdmin.role,
        venuePermissions: newAdmin.venuePermissions.map((p: { venue: { brandId: string; name: string } }) => ({
          brandId: p.venue.brandId,
          name: p.venue.name,
        })),
      },
    });
  } catch (error: any) {
    console.error("Error creating admin:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Toggle admin active status (only MAIN_ADMIN)
export async function PATCH(request: NextRequest) {
  try {
    const admin = await verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (admin.role !== "MAIN_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, active } = body;

    if (!id || typeof active !== "boolean") {
      return NextResponse.json(
        { error: "Admin ID and active status are required" },
        { status: 400 }
      );
    }

    // Prevent disabling yourself
    if (id === admin.id && !active) {
      return NextResponse.json(
        { error: "Cannot disable your own account" },
        { status: 400 }
      );
    }

    const updated = await prisma.admin.update({
      where: { id },
      data: { active },
      include: {
        venuePermissions: {
          include: {
            venue: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json({ admin: updated });
  } catch (error) {
    console.error("Error updating admin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
