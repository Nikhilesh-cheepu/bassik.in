/**
 * One-off script: Check venue location data (address, mapUrl) for all outlets.
 * Run: npx tsx scripts/check-venue-locations.ts
 */
import { prisma } from "../lib/db";

const BRAND_IDS = [
  "the-hub",
  "alehouse",
  "c53",
  "boiler-room",
  "skyhy",
  "kiik69",
  "club-rogue-gachibowli",
  "club-rogue-kondapur",
  "club-rogue-jubilee-hills",
  "sound-of-soul",
  "thezenzspot",
  "firefly",
];

async function main() {
  const venues = await prisma.venue.findMany({
    where: {},
    select: { brandId: true, address: true, mapUrl: true },
    orderBy: { brandId: "asc" },
  });

  const byBrand = new Map(venues.map((v) => [v.brandId, v]));

  console.log("\n=== VENUE LOCATION DATA ===\n");
  console.log("Outlets WITH venue row in DB:\n");

  for (const v of venues) {
    const hasMap = !!v.mapUrl?.trim();
    const hasAddr = !!v.address?.trim();
    const status = hasMap && hasAddr ? "✓" : hasMap ? "⚠ address empty" : hasAddr ? "⚠ mapUrl empty" : "✗ both empty";
    console.log(`${v.brandId}`);
    console.log(`  address: ${v.address || "(empty)"}`);
    console.log(`  mapUrl:  ${v.mapUrl || "(empty)"}`);
    console.log(`  ${status}\n`);
  }

  console.log("Outlets in BRANDS but NO venue row in DB:\n");
  const missing = BRAND_IDS.filter((id) => !byBrand.has(id));
  if (missing.length === 0) {
    console.log("  (none – all brands have a venue row)\n");
  } else {
    for (const id of missing) {
      console.log(`  ${id} – NO VENUE ROW (will get 404 or fallback)\n`);
    }
  }

  console.log("=== OUTLETS WITHOUT mapUrl (need Google Maps link) ===\n");
  const noMap = venues.filter((v) => !v.mapUrl?.trim());
  if (noMap.length === 0) {
    console.log("  (all have mapUrl)\n");
  } else {
    noMap.forEach((v) => console.log(`  - ${v.brandId}`));
    console.log("");
  }
}

main()
  .catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
