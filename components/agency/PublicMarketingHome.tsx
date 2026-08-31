"use client";

import Image from "next/image";
import { useState } from "react";
import GrowthPathCarousel from "@/components/agency/GrowthPathCarousel";
import {
  GROWTH_PROOF_LINE,
  GROWTH_SOFT_RANGE,
  GROWTH_VERTICALS,
  type GrowthVerticalId,
} from "@/lib/bassik-growth";
import { BASSIK_FRIEND_CHAT, getAgencyPortfolioBrands } from "@/lib/bassik-agency";

const VERTICAL_ICON: Record<GrowthVerticalId, string> = {
  clubs: "♪",
  restaurants: "◎",
  hotels: "⌂",
  education: "✦",
  healthcare: "+",
};

function SiriGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="marketing-float absolute -left-[20%] -top-[30%] h-[70%] w-[70%] rounded-full opacity-80 blur-[80px]"
        style={{ background: "radial-gradient(circle, #FFB4A2 0%, transparent 70%)" }}
      />
      <div
        className="marketing-float-slow absolute -right-[15%] top-[5%] h-[65%] w-[65%] rounded-full opacity-75 blur-[90px]"
        style={{ background: "radial-gradient(circle, #C4B5FD 0%, transparent 70%)" }}
      />
      <div
        className="marketing-float absolute bottom-[-10%] left-[25%] h-[50%] w-[55%] rounded-full opacity-70 blur-[80px]"
        style={{ background: "radial-gradient(circle, #A5C8FF 0%, transparent 70%)" }}
      />
    </div>
  );
}

const PATH_STEPS = [
  { title: "Get seen", body: "People notice you", wash: "from-[#FFB4A2]/50 to-[#F5A3C7]/30", icon: "◎" },
  { title: "Get trusted", body: "People believe you", wash: "from-[#C4B5FD]/45 to-[#A5C8FF]/30", icon: "♡" },
  { title: "Get customers", body: "Calls & visits", wash: "from-[#A5C8FF]/45 to-[#C4B5FD]/30", icon: "→" },
] as const;

function logoSrc(brandId: string, logoPath?: string) {
  if (logoPath) return logoPath;
  if (brandId.startsWith("club-rogue")) return "/logos/club-rogue.png";
  return `/logos/${brandId}.png`;
}

export default function PublicMarketingHome({ talkUrl }: { talkUrl: string }) {
  const [verticalId, setVerticalId] = useState<GrowthVerticalId>("clubs");
  const portfolio = getAgencyPortfolioBrands();

  return (
    <>
      {/* 360° friend voice */}
      <header className="relative isolate overflow-hidden px-4 pb-4 pt-1 sm:px-8 sm:pb-6">
        <SiriGlow />
        <div className="relative mx-auto max-w-5xl">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C4B5FD] to-[#A5C8FF] text-[13px] font-bold text-white shadow-md ring-2 ring-white">
              B
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#8B8494]">Bassik · Hyderabad</p>
              <div className="marketing-voice-glow mt-1 inline-block rounded-[1.2rem] rounded-tl-md bg-white/90 px-4 py-2.5 shadow-md ring-1 ring-[#C4B5FD]/30">
                <p className="font-[family-name:var(--font-agency-display)] text-[1.4rem] font-semibold leading-tight sm:text-[1.55rem]">
                  360° marketing.
                </p>
              </div>
            </div>
          </div>

          <h1 className="mt-5 font-[family-name:var(--font-agency-display)] text-[clamp(1.45rem,5.5vw,2rem)] font-semibold leading-[1.15] tracking-tight text-[#12131A]">
            Running business and marketing both?
          </h1>
          <p className="mt-2 text-[15px] font-semibold text-[#6B6570]">Leave marketing to us.</p>
          <p className="mt-1 text-[13px] text-[#8B8494]">You run your shop. We bring customers.</p>
        </div>
      </header>

      {/* 2-line friend chat */}
      <section className="px-4 pb-5 sm:px-8" aria-label="Friend chat">
        <div className="mx-auto max-w-5xl space-y-2">
          {BASSIK_FRIEND_CHAT.map((msg) => (
            <div key={msg.text} className={`flex ${msg.from === "buddy" ? "justify-end" : "justify-start"}`}>
              <p
                className={`max-w-[90%] rounded-[1rem] px-3.5 py-2 text-[13px] leading-snug sm:text-[14px] ${
                  msg.from === "buddy"
                    ? "rounded-br-sm bg-[#12131A] text-white"
                    : "rounded-bl-sm bg-white text-[#12131A] shadow-sm ring-1 ring-black/[0.06]"
                }`}
              >
                {msg.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 3 steps */}
      <section className="px-4 pb-6 sm:px-8" aria-label="How it works">
        <div className="mx-auto grid max-w-5xl grid-cols-3 gap-2 sm:gap-3">
          {PATH_STEPS.map((step) => (
            <div
              key={step.title}
              className={`rounded-2xl border border-white/60 bg-gradient-to-br ${step.wash} p-3 text-center shadow-sm ring-1 ring-black/5 sm:p-4`}
            >
              <span className="text-lg text-[#8B7BB8]" aria-hidden>
                {step.icon}
              </span>
              <p className="mt-1.5 font-[family-name:var(--font-agency-display)] text-[12px] font-semibold sm:text-[13px]">
                {step.title}
              </p>
              <p className="mt-0.5 text-[9px] text-[#6B6570] sm:text-[10px]">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Packages — original card design */}
      <section
        id="paths"
        className="relative isolate border-t border-[#E6E1E8]/70 px-4 py-6 sm:px-8 sm:py-10"
        aria-labelledby="paths-heading"
      >
        <SiriGlow />
        <div className="relative mx-auto max-w-5xl">
          <h2
            id="paths-heading"
            className="font-[family-name:var(--font-agency-display)] text-[1.35rem] font-semibold tracking-tight sm:text-[1.75rem]"
          >
            Care · Growth · Revenue
          </h2>
          <p className="mt-1 text-[12px] text-[#6B6570] sm:text-[13px]">Pick what fits you. Swipe on phone.</p>

          <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Business type">
            {GROWTH_VERTICALS.map((v) => {
              const active = v.id === verticalId;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setVerticalId(v.id)}
                  className={`inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold sm:min-h-9 sm:px-3.5 sm:text-[13px] ${
                    active
                      ? "bg-[#12131A] text-white shadow-sm"
                      : "border border-[#E6E1E8] bg-white/75 text-[#6B6570] ring-1 ring-black/5"
                  }`}
                >
                  <span className={active ? "text-[#C4B5FD]" : "text-[#A89EB8]"} aria-hidden>
                    {VERTICAL_ICON[v.id]}
                  </span>
                  {v.shortLabel}
                </button>
              );
            })}
          </div>

          <div className="mt-4 sm:mt-5">
            <GrowthPathCarousel verticalId={verticalId} showFromPricing />
          </div>

          <p className="mt-3 text-center text-[10px] leading-snug text-[#8B8494] sm:text-[12px]">
            {GROWTH_SOFT_RANGE}
          </p>
        </div>
      </section>

      {/* Proof */}
      <section className="px-4 pb-8 sm:px-8 sm:pb-12" aria-label="Trusted by">
        <div className="mx-auto max-w-5xl text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {portfolio.slice(0, 8).map((brand) => (
              <div
                key={brand.id}
                className="flex h-9 items-center justify-center rounded-xl bg-[#12131A] px-3 shadow-sm"
              >
                <Image
                  src={logoSrc(brand.id, brand.logoPath)}
                  alt={brand.shortName}
                  width={72}
                  height={24}
                  className="h-5 w-auto max-w-[4.5rem] object-contain brightness-0 invert"
                />
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-[#6B6570] sm:text-[12px]">{GROWTH_PROOF_LINE}</p>
          <a
            href={talkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 hidden min-h-11 w-full max-w-md items-center justify-center rounded-full bg-[#12131A] text-[14px] font-semibold text-white shadow-sm sm:mx-auto sm:inline-flex"
          >
            WhatsApp Bassik
          </a>
        </div>
      </section>
    </>
  );
}
