"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BRANDS } from "@/lib/brands";
import BrandTabs from "@/components/BrandTabs";
import ReservationForm from "@/components/ReservationForm";
import Navbar from "@/components/Navbar";

export default function ReservationsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const requestedBrandId = searchParams.get("brand");
  const initialBrand =
    BRANDS.find((b) => b.id === requestedBrandId) ?? BRANDS[0];

  const [activeBrandId, setActiveBrandId] = useState<string>(initialBrand.id);

  const activeBrand =
    BRANDS.find((brand) => brand.id === activeBrandId) || BRANDS[0];

  const activeBrandLabel =
    activeBrand.id === "c53" ? "C53" : activeBrand.shortName;

  const handleExploreClick = () => {
    if (activeBrand.exploreUrl && activeBrand.exploreUrl !== "#") {
      window.open(activeBrand.exploreUrl, "_blank");
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="py-4 px-3 overflow-y-auto">
        <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto space-y-4 md:space-y-6">
          {/* Page header */}
          <div className="mt-1 md:mt-2 flex items-center justify-between text-[11px] md:text-xs text-gray-400">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-100 transition-colors"
            >
              <span className="text-lg leading-none">←</span>
              <span>Back to Home</span>
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
              Reservations
            </h1>
            <p className="mt-1 text-[11px] md:text-xs text-gray-400">
              Choose a venue and send us your table request.
            </p>
          </div>

          {/* Brand tabs */}
          <div className="mt-2">
            <BrandTabs
              brands={BRANDS}
              activeBrandId={activeBrandId}
              onBrandChange={setActiveBrandId}
            />
          </div>

          {/* Currently booking strip */}
          <div className="flex items-center justify-between rounded-full bg-black/40 border border-white/5 px-3 py-2 text-[11px] md:text-xs text-gray-300 shadow-[0_18px_40px_rgba(0,0,0,0.7)]">
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: activeBrand.accentColor }}
              />
              <span className="font-medium">
                Currently booking: {activeBrandLabel}
              </span>
            </div>
            <span className="hidden xs:inline text-gray-400">
              Any outlet. One quick form.
            </span>
          </div>

          {/* Reservation Form */}
          <div className="md:flex md:justify-center">
            <div className="w-full md:max-w-xl lg:max-w-2xl">
              <ReservationForm brand={activeBrand} />
            </div>
          </div>

          {/* Explore CTA + helper line */}
          <div className="flex flex-col gap-2 md:gap-3">
            <button
              type="button"
              onClick={handleExploreClick}
              className="w-full rounded-2xl bg-gradient-to-r from-white/5 to-white/0 border border-white/10 px-4 py-3 text-left text-xs md:text-sm text-gray-100 hover:border-white/30 transition-all shadow-[0_16px_40px_rgba(0,0,0,0.7)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    Want to know more about {activeBrandLabel}?
                  </p>
                  <p className="mt-0.5 text-[11px] md:text-xs text-gray-400">
                    Menus, photos, offers &amp; more — it’s just one click away.
                  </p>
                </div>
                <span className="shrink-0 text-[11px] md:text-xs text-amber-300 hover:underline">
                  Explore {activeBrandLabel} →
                </span>
              </div>
            </button>

            <button
              type="button"
              className="self-center text-[10px] md:text-xs text-gray-500 hover:text-gray-300 transition-colors"
              onClick={() => {
                window.open("tel:7013884485");
              }}
            >
              Prefer talking? Call our reservations team at{" "}
              <span className="font-medium text-gray-300">7013884485</span>.
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}


