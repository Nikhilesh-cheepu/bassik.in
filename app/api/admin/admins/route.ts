import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAdminToken, canAccessVenue } from "@/lib/admin-auth";
import { createAdmin } from "@/lib/auth";
import { AdminRole } from "@prisma/client";

// GET - Get all admins (only MAIN_ADMIN)
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (admin.role !== AdminRole.MAIN_ADMIN) {
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
      orderBy: { createdAt: "desc" },
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

    if (admin.role !== AdminRole.MAIN_ADMIN) {
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

    const adminRole = role === "MAIN_ADMIN" ? AdminRole.MAIN_ADMIN : AdminRole.ADMIN;

    // If creating a regular admin, venueIds are required
    if (adminRole === AdminRole.ADMIN && (!venueIds || venueIds.length === 0)) {
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
        venuePermissions: newAdmin.venuePermissions.map((p) => ({
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

// DELETE - Delete admin (only MAIN_ADMIN)
export async function DELETE(request: NextRequest) {
  try {
    const admin = await verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (admin.role !== AdminRole.MAIN_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get("id");

    if (!adminId) {
      return NextResponse.json(
        { error: "Admin ID required" },
        { status: 400 }
      );
    }

    // Prevent deleting yourself
    if (adminId === admin.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    await prisma.admin.delete({
      where: { id: adminId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting admin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
