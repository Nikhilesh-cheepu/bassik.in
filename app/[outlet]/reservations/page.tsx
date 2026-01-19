"use client";

import { useState, Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { BRANDS } from "@/lib/brands";
import ReservationForm from "@/components/ReservationForm";
import Navbar from "@/components/Navbar";

function ReservationsContent() {
  const params = useParams();
  const router = useRouter();
  const outletSlug = params?.outlet as string;

  // Find brand by slug
  const findBrandBySlug = (slug: string) => {
    return BRANDS.find(b => b.id === slug) || BRANDS[0];
  };

  const initialBrand = findBrandBySlug(outletSlug);
  const [activeBrandId, setActiveBrandId] = useState<string>(initialBrand.id);

  const activeBrand =
    BRANDS.find((brand) => brand.id === activeBrandId) || BRANDS[0];

  // Update URL when brand changes
  useEffect(() => {
    if (activeBrandId !== outletSlug) {
      router.replace(`/${activeBrandId}/reservations`);
    }
  }, [activeBrandId, outletSlug, router]);

  return (
    <div
      className="min-h-screen bg-white"
      style={{ backgroundColor: "#ffffff" }}
    >
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        {/* Modern Header with Gradient */}
        <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center gap-4">
              {/* Back button - Modern */}
              <button
                type="button"
                onClick={() => router.push(`/${activeBrandId}`)}
                className="inline-flex items-center justify-center gap-2 text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl px-3 py-2 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline text-sm font-medium">Back</span>
              </button>

              {/* Outlet Dropdown - Modern Card Style */}
              <div className="flex-1 relative">
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                  Select Outlet
                </label>
                <div className="relative">
                  <select
                    value={activeBrandId}
                    onChange={(e) => {
                      setActiveBrandId(e.target.value);
                    }}
                    className="w-full px-4 py-3 pr-10 text-sm font-semibold bg-white border-2 rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer shadow-sm hover:shadow-md"
                    style={{
                      borderColor: activeBrand.accentColor + "40",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = activeBrand.accentColor;
                      e.target.style.boxShadow = `0 0 0 4px ${activeBrand.accentColor}15`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = activeBrand.accentColor + "40";
                      e.target.style.boxShadow = "";
                    }}
                  >
                    {BRANDS.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.shortName}
                        {brand.id.startsWith("club-rogue") && ` - ${brand.name.split("–")[1]?.trim()}`}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg
                      className="w-5 h-5 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Form Section - Premium Card */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 overflow-x-hidden">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 md:p-10 relative overflow-hidden">
            {/* Decorative gradient circle */}
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-orange-100/50 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <ReservationForm brand={activeBrand} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
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
