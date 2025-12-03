"use client";

import { useState } from "react";
import { BRANDS, Brand } from "@/lib/brands";
import BrandTabs from "@/components/BrandTabs";
import ReservationForm from "@/components/ReservationForm";
import Navbar from "@/components/Navbar";

export default function Home() {
  const [activeBrandId, setActiveBrandId] = useState<string>(BRANDS[0].id);

  const activeBrand = BRANDS.find((brand) => brand.id === activeBrandId) || BRANDS[0];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="py-3 px-3 overflow-y-auto">
      <div className="max-w-md mx-auto">
        {/* Header Section - Compact */}
        <div className="text-center mb-3">
          <h1 className="text-xl font-bold text-white mb-1">
            Bassik Reservations
          </h1>
          <p className="text-gray-400 text-[10px]">
            Book your table at any of our venues
          </p>
        </div>

        {/* Brand Tabs - Compact */}
        <div className="mb-3">
          <BrandTabs
            brands={BRANDS}
            activeBrandId={activeBrandId}
            onBrandChange={setActiveBrandId}
          />
        </div>

        {/* Reservation Form - Compact */}
        <ReservationForm brand={activeBrand} />
      </div>
      </main>
    </div>
  );
}

