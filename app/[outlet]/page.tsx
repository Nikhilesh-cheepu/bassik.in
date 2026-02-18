import { Suspense } from "react";
import { getVenueDataByBrandId } from "@/lib/venue-data";
import { BRANDS } from "@/lib/brands";
import OutletPageClient from "./OutletPageClient";

interface PageProps {
  params: Promise<{ outlet: string }>;
}

export const revalidate = 30;

export default async function OutletPage({ params }: PageProps) {
  const { outlet: outletSlug } = await params;
  const brandId = BRANDS.some((b) => b.id === outletSlug) ? outletSlug : BRANDS[0].id;
  const initialVenueData = await getVenueDataByBrandId(brandId);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto" />
            <p className="mt-4 text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <OutletPageClient key={outletSlug} outletSlug={outletSlug} initialVenueData={initialVenueData} />
    </Suspense>
  );
}
