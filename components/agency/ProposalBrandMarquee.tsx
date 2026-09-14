"use client";

import Image from "next/image";
import { memo } from "react";
import {
  BASSIK_PARTNER_BRANDS,
  type ProposalPartnerBrand,
} from "@/lib/proposals/partner-brands";

const TILE_COLORS = ["#A855F7", "#B8FF3C", "#22D3EE", "#FACC15", "#FB923C", "#F472B6"];

function BrandTile({ brand, color }: { brand: ProposalPartnerBrand; color: string }) {
  const isSvg = brand.logoPath.endsWith(".svg");
  return (
    <div className="flex w-[104px] shrink-0 flex-col items-center gap-2 sm:w-[112px] lg:w-[120px]">
      <div
        className="proposal-skill relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden bg-black/40 sm:h-20 sm:w-20 lg:h-[88px] lg:w-[88px]"
        style={{ borderColor: color, color }}
      >
        <Image
          src={brand.logoPath}
          alt={brand.name}
          fill
          sizes="88px"
          unoptimized={isSvg}
          className="object-contain p-2"
        />
      </div>
      <div className="px-1 text-center">
        <p className="line-clamp-2 font-[family-name:var(--font-agency-display)] text-[11px] font-bold leading-tight text-white sm:text-[12px]">
          {brand.name}
        </p>
        {brand.subtitle ? (
          <p className="mt-0.5 text-[10px] font-semibold text-white/45">{brand.subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

const BrandStrip = memo(function BrandStrip({
  keyPrefix,
  ariaHidden,
}: {
  keyPrefix: string;
  ariaHidden?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-start gap-4 py-2 pl-3 pr-3 sm:gap-5" aria-hidden={ariaHidden}>
      {BASSIK_PARTNER_BRANDS.map((brand, idx) => (
        <BrandTile
          key={`${keyPrefix}-${brand.name}-${brand.subtitle ?? idx}`}
          brand={brand}
          color={TILE_COLORS[idx % TILE_COLORS.length]}
        />
      ))}
      <span className="w-2 shrink-0" aria-hidden />
    </div>
  );
});

export default function ProposalBrandMarquee() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-10 bg-gradient-to-r from-[#15171e] to-transparent lg:w-16" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-10 bg-gradient-to-l from-[#15171e] to-transparent lg:w-16" />
      <div className="inline-flex w-max max-w-none animate-ticker [animation-duration:55s]">
        <BrandStrip keyPrefix="a" />
        <BrandStrip keyPrefix="b" ariaHidden />
      </div>
    </div>
  );
}
