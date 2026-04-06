import { Suspense } from "react";
import { getVenueDataByBrandId } from "@/lib/venue-data";
import { BRANDS } from "@/lib/brands";
import OutletPageClient from "./OutletPageClient";

interface PageProps {
  params: Promise<{ outlet: string }>;
  searchParams: Promise<{ eventId?: string }>;
}

export const revalidate = 30;

export default async function OutletPage({ params, searchParams }: PageProps) {
  const { outlet: outletSlug } = await params;
  const { eventId } = await searchParams;
  const brandId = BRANDS.some((b) => b.id === outletSlug) ? outletSlug : BRANDS[0].id;
  const initialVenueData = await getVenueDataByBrandId(brandId);
  const initialEventId = typeof eventId === "string" && eventId.trim() ? eventId.trim() : null;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black w-full">
          <div className="w-full max-w-full border-b border-white/10 bg-black/50 pt-2 pb-3">
            <div
              className="mx-auto max-w-[400px] w-[78vw] animate-pulse rounded-[20px] bg-white/10"
              style={{ aspectRatio: "9 / 16", maxHeight: "54vh" }}
            />
          </div>
          <div className="mx-auto max-w-md px-4 pt-6 space-y-3">
            <div className="h-4 w-3/4 rounded bg-white/10 animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-white/10 animate-pulse" />
          </div>
        </div>
      }
    >
      <OutletPageClient
        key={outletSlug}
        outletSlug={outletSlug}
        initialVenueData={initialVenueData}
        initialEventId={initialEventId}
      />
    </Suspense>
  );
}
