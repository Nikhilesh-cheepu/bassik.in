/**
 * One-time cleanup: remove test chat opens, keep real guest threads, smart-rename labels.
 * Usage: npx tsx scripts/prune-chat-leads.ts
 * Optional: npx tsx scripts/prune-chat-leads.ts boiler-room
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  const { prisma } = await import("../lib/db");
  const { pruneAndRelabelChatLeads } = await import("../lib/venue-chat-leads-cleanup");

  const brandId = process.argv[2]?.trim() || null;
  const result = await pruneAndRelabelChatLeads(brandId);
  console.log(JSON.stringify({ brandId: brandId ?? "all", ...result }, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
