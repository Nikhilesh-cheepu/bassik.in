"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BRANDS } from "@/lib/brands";
import ReservationForm from "@/components/ReservationForm";
import Navbar from "@/components/Navbar";

function ReservationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const requestedBrandId = searchParams.get("brand");
  const initialBrand =
    BRANDS.find((b) => b.id === requestedBrandId) ?? BRANDS[0];

  const [activeBrandId, setActiveBrandId] = useState<string>(initialBrand.id);

  const activeBrand =
    BRANDS.find((brand) => brand.id === activeBrandId) || BRANDS[0];

  return (
    <div
      className="min-h-screen bg-white"
      style={{ backgroundColor: "#ffffff" }}
    >
      <Navbar />
      <main className="bg-gray-50 min-h-screen">
        {/* Compact Header with Dropdown */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              {/* Back button */}
              <button
                type="button"
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm flex-shrink-0"
              >
                <span className="text-lg">←</span>
                <span className="hidden sm:inline">Back</span>
              </button>

              {/* Outlet Dropdown - Full Width */}
              <div className="flex-1 relative">
                <label className="block text-xs text-gray-500 mb-1 font-medium">
                  Select Outlet
                </label>
                <div className="relative">
                  <select
                    value={activeBrandId}
                    onChange={(e) => setActiveBrandId(e.target.value)}
                    className="w-full px-3 py-2 pr-8 text-sm font-medium bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-all appearance-none cursor-pointer"
                    style={{
                      borderColor: activeBrand.accentColor + "40",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = activeBrand.accentColor;
                      e.target.style.boxShadow = `0 0 0 3px ${activeBrand.accentColor}20`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "";
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
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Form Section */}
        <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 md:p-8">
            <ReservationForm brand={activeBrand} />
          </div>

          {/* Helper Info */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Need help?{" "}
              <button
                type="button"
                onClick={() => window.open("tel:7013884485")}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Call 7013884485
              </button>
            </p>
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
        <div className="min-h-screen bg-white">
          <Navbar />
          <main className="bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto px-4 py-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-center">
                  <h1 className="text-2xl font-semibold text-gray-900">
                    Loading...
                  </h1>
                </div>
              </div>
            </div>
          </main>
        </div>
      }
    >
      <ReservationsContent />
    </Suspense>
  );
}
