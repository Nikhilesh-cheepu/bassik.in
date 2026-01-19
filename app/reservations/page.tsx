"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BRANDS } from "@/lib/brands";

function ReservationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const requestedBrandId = searchParams.get("brand");
    const brand = BRANDS.find((b) => b.id === requestedBrandId) ?? BRANDS[0];
    // Redirect to new path-based route
    router.replace(`/${brand.id}/reservations`);
  }, [searchParams, router]);

  return null;
}

export default function ReservationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <ReservationsContent />
    </Suspense>
  );
}
