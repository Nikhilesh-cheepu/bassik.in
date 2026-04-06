import { notFound } from "next/navigation";
import { BRANDS, HIDDEN_BRAND_IDS } from "@/lib/brands";
import VenuesPageClient from "../VenuesPageClient";

export default async function VenueByBrandPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const valid = BRANDS.some((b) => b.id === brandId && !HIDDEN_BRAND_IDS.has(b.id));
  if (!valid) notFound();
  return <VenuesPageClient initialBrandId={brandId} />;
}
