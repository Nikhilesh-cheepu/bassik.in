"use client";

import Image from "next/image";
import { memo } from "react";
import {
  PROPOSAL_BRAND_GROUPS,
  type ProposalPartnerBrand,
} from "@/lib/proposals/partner-brands";

const TILE_COLORS = ["#A855F7", "#B8FF3C", "#22D3EE", "#FACC15", "#FB923C", "#F472B6"];

function BrandTile({ brand, color }: { brand: ProposalPartnerBrand; color: string }) {
  const isSvg = brand.logoPath.endsWith(".svg");
  return (
    <div className="flex w-[104px] shrink-0 flex-col items-center gap-2 sm:w-[112px] lg:w-[120px]">
      <div
        className={`proposal-skill relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden sm:h-20 sm:w-20 lg:h-[88px] lg:w-[88px] ${
          brand.lightBg ? "bg-white" : "bg-black/50"
        }`}
        style={{ borderColor: color, color }}
      >
        <Image
          src={brand.logoPath}
          alt={brand.name}
          fill
          sizes="88px"
          unoptimized={isSvg}
          className="object-contain p-1.5"
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

function BigDot() {
  return (
    <div className="mx-2 flex shrink-0 items-center self-center px-2 sm:mx-3 sm:px-3" aria-hidden>
      <span className="h-4 w-4 rounded-full bg-[#B8FF3C] shadow-[0_0_16px_rgba(184,255,60,0.85)] sm:h-5 sm:w-5" />
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
  let colorIdx = 0;
  return (
    <div className="flex shrink-0 items-start gap-3 py-2 pl-2 pr-2 sm:gap-4" aria-hidden={ariaHidden}>
      {PROPOSAL_BRAND_GROUPS.map((group, groupIdx) => (
        <div key={`${keyPrefix}-${group.id}`} className="flex shrink-0 items-start gap-3 sm:gap-4">
          {groupIdx > 0 ? <BigDot /> : null}
          {group.brands.map((brand, idx) => {
            const color = TILE_COLORS[colorIdx % TILE_COLORS.length];
            colorIdx += 1;
            return (
              <BrandTile
                key={`${keyPrefix}-${group.id}-${brand.name}-${brand.subtitle ?? idx}`}
                brand={brand}
                color={color}
              />
            );
          })}
        </div>
      ))}
      <span className="w-4 shrink-0" aria-hidden />
    </div>
  );
});

export default function ProposalBrandMarquee() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 px-0.5">
        {PROPOSAL_BRAND_GROUPS.map((group, i) => (
          <span key={group.id} className="flex items-center gap-2">
            {i > 0 ? (
              <span className="h-1.5 w-1.5 rounded-full bg-[#B8FF3C]/80" aria-hidden />
            ) : null}
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#B8FF3C] sm:text-[12px]">
              {group.title}
            </span>
          </span>
        ))}
      </div>

      <div className="proposal-glass relative overflow-hidden rounded-[1.35rem] py-4 lg:rounded-[1.5rem] lg:py-5">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-10 bg-gradient-to-r from-[#15171e] to-transparent lg:w-16" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-10 bg-gradient-to-l from-[#15171e] to-transparent lg:w-16" />
        <div className="inline-flex w-max max-w-none animate-ticker [animation-duration:38s]">
          <BrandStrip keyPrefix="a" />
          <BrandStrip keyPrefix="b" ariaHidden />
        </div>
      </div>
    </div>
  );
}
