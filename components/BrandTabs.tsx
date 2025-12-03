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
    const label =
      brand.id === "c53" ? "C53" : brand.shortName.toUpperCase();
    return (
      <button
        key={brand.id}
        onClick={() => onBrandChange(brand.id)}
        className={`
          px-3 py-2 rounded-full text-[11px] md:text-xs font-medium transition-all duration-200
          flex items-center justify-center h-8
          whitespace-nowrap flex-1
          border
          ${
            isActive
              ? "text-slate-950 bg-white shadow-[0_12px_30px_rgba(0,0,0,0.8)] scale-[1.02]"
              : "text-gray-200/90 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30"
          }
        `}
        style={{
          backgroundColor: isActive ? brand.accentColor : undefined,
          boxShadow: isActive
            ? `0 0 0 1px ${brand.accentColor}40, 0 18px 40px rgba(0,0,0,0.8)`
            : "0 0 0 1px rgba(148,163,184,0.12)",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-2 bg-black/30 border border-white/5 rounded-2xl px-2.5 py-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-md">
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

