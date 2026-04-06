"use client";

import dynamic from "next/dynamic";
import { notFound, useParams } from "next/navigation";
import { BRANDS, HIDDEN_BRAND_IDS } from "@/lib/brands";

const VenuesPageClient = dynamic(() => import("../VenuesPageClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
        <p className="mt-3 text-sm text-slate-600">Loading venue…</p>
      </div>
    </div>
  ),
});

export default function VenueByBrandPage() {
  const params = useParams();
  const brandId = typeof params.brandId === "string" ? params.brandId : "";
  const valid = BRANDS.some((b) => b.id === brandId && !HIDDEN_BRAND_IDS.has(b.id));
  if (!valid) notFound();
  return <VenuesPageClient initialBrandId={brandId} />;
}
