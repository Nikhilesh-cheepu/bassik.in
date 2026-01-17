"use client";

import { Brand } from "@/lib/brands";

interface BrandTabsProps {
  brands: Brand[];
  activeBrandId: string;
  onBrandChange: (brandId: string) => void;
}

export default function BrandTabs({
  brands,
  activeBrandId,
  onBrandChange,
}: BrandTabsProps) {
  // Find brands by ID in the specified order
  const alehouse = brands.find((b) => b.id === "alehouse")!;
  const boilerRoom = brands.find((b) => b.id === "boiler-room")!;
  const c53 = brands.find((b) => b.id === "c53")!;
  const skyhy = brands.find((b) => b.id === "skyhy")!;
  const kiik69 = brands.find((b) => b.id === "kiik69")!;
  const clubRogueJubileeHills = brands.find(
    (b) => b.id === "club-rogue-jubilee-hills"
  )!;
  const clubRogueGachibowli = brands.find(
    (b) => b.id === "club-rogue-gachibowli"
  )!;
  const clubRogueKondapur = brands.find(
    (b) => b.id === "club-rogue-kondapur"
  )!;
  const soundOfSoul = brands.find((b) => b.id === "sound-of-soul")!;
  const rejoy = brands.find((b) => b.id === "rejoy")!;
  const firefly = brands.find((b) => b.id === "firefly")!;

  const orderedBrands = [
    alehouse,
    boilerRoom,
    c53,
    skyhy,
    kiik69,
    clubRogueJubileeHills,
    clubRogueGachibowli,
    clubRogueKondapur,
    soundOfSoul,
    rejoy,
    firefly,
  ];

  return (
    <div className="w-full">
      {/* Swiggy-style horizontal scrollable tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {orderedBrands.map((brand) => {
          const isActive = brand.id === activeBrandId;
          const label =
            brand.id === "c53" ? "C53" : brand.shortName.toUpperCase();

          return (
            <button
              key={brand.id}
              onClick={() => onBrandChange(brand.id)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap
                transition-all duration-200 flex-shrink-0
                ${
                  isActive
                    ? "text-white shadow-sm"
                    : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                }
              `}
              style={{
                backgroundColor: isActive ? brand.accentColor : undefined,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
