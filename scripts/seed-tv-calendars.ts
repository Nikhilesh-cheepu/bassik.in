import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  // Import after env is loaded (lib/db reads DATABASE_* at module init)
  const { seedDesignerRollingWindow } = await import("../lib/team-designer-jobs");
  const { DESIGNER_WINDOW_DAYS } = await import("../lib/team-designer-jobs-shared");
  const { getTodayKey } = await import("../lib/team-checklists");
  const result = await seedDesignerRollingWindow({
    createdBy: "system-seed",
    fromDate: getTodayKey(),
    days: DESIGNER_WINDOW_DAYS,
    lanes: ["WEEKEND"],
  });
  console.log(JSON.stringify(result, null, 2));

  const { PrismaClient } = await import("@prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { Pool } = await import("pg");
  const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL!;
  const pool = new Pool({ connectionString: url, max: 1 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const cals = await prisma.teamDesignerJob.findMany({
    where: { format: "calendar", status: "WAITING_BRIEF" },
    select: { title: true, postDate: true, dueDate: true, status: true, outletId: true },
    orderBy: { postDate: "asc" },
  });
  console.log("WAITING_BRIEF calendars:", cals.length);
  for (const c of cals) console.log(JSON.stringify(c));
  await prisma.$disconnect();
  await pool.end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
