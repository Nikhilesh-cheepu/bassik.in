import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
if (
  process.env.DATABASE_PUBLIC_URL?.trim() &&
  (!process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_URL.includes("railway.internal"))
) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL.trim();
}

async function main() {
  const { prisma } = await import("../lib/db");
  const before = await prisma.$queryRawUnsafe<
    Array<{ id: string; title: string; assigneeId: string; status: string }>
  >(
    `SELECT id, title, "assigneeId", status FROM "TeamDesignerJob"
     WHERE "catchUpExempt" = true AND status <> 'DESIGN_DONE'`
  );
  console.log("exempt open before:", before);
  const n = await prisma.$executeRawUnsafe(
    `UPDATE "TeamDesignerJob" SET "catchUpExempt" = false, "updatedAt" = NOW()
     WHERE "catchUpExempt" = true AND status <> 'DESIGN_DONE'`
  );
  console.log("cleared:", n);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
