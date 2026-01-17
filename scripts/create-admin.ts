import { PrismaClient } from "@prisma/client";
import { createAdmin } from "../lib/auth";
import { AdminRole } from "@prisma/client";

// For scripts, we can use Prisma with direct connection
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
} as any);

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "changeme123";
  const role = (process.env.ADMIN_ROLE as AdminRole) || AdminRole.MAIN_ADMIN;

  try {
    const admin = await createAdmin(username, password, role);
    console.log("✅ Admin created successfully!");
    console.log(`   Username: ${admin.username}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   ID: ${admin.id}`);
  } catch (error: any) {
    if (error.code === "P2002") {
      console.log("ℹ️  Admin already exists with this username");
    } else {
      console.error("❌ Error creating admin:", error);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
