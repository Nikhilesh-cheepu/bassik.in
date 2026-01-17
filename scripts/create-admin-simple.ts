import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AdminRole } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["error"],
} as any);

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "changeme123";
  const role = (process.env.ADMIN_ROLE as AdminRole) || AdminRole.MAIN_ADMIN;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const admin = await prisma.admin.create({
      data: {
        username,
        password: hashedPassword,
        role,
      },
    });
    
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
