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

  const row1 = [alehouse, boilerRoom, c53, skyhy];
  const row2 = [kiik69, clubRogueJubileeHills];
  const row3 = [clubRogueGachibowli, clubRogueKondapur];

  const renderButton = (brand: Brand) => {
    const isActive = brand.id === activeBrandId;
    return (
      <button
        key={brand.id}
        onClick={() => onBrandChange(brand.id)}
        className={`
          px-2 py-1.5 rounded-xl text-[10px] font-medium transition-all duration-200
          flex items-center justify-center h-7
          whitespace-nowrap flex-1
          ${
            isActive
              ? "text-white"
              : "text-white bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800 hover:border-gray-600"
          }
        `}
        style={{
          backgroundColor: isActive ? brand.accentColor : undefined,
          boxShadow: isActive
            ? `0 2px 8px ${brand.accentColor}30`
            : "none",
        }}
      >
        {brand.shortName}
      </button>
    );
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-1.5">
        {/* Row 1: 4 tabs */}
        <div className="flex gap-1.5 w-full">
          {row1.map((brand) => renderButton(brand))}
        </div>

        {/* Row 2: 2 tabs, centered */}
        <div className="flex gap-1.5 justify-center w-full">
          {row2.map((brand) => renderButton(brand))}
        </div>

        {/* Row 3: 2 tabs, centered */}
        <div className="flex gap-1.5 justify-center w-full">
          {row3.map((brand) => renderButton(brand))}
        </div>
      </div>
    </div>
  );
}

