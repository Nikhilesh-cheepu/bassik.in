"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  GROWTH_360_LAYERS,
  GROWTH_MARKETING_BLOCKS,
  GROWTH_PROOF_LINE,
  growthBlockAccent,
  type GrowthMarketingBlock,
} from "@/lib/bassik-growth";
import { getAgencyPortfolioBrands } from "@/lib/bassik-agency";

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

function Hero360Ring() {
  return (
    <div className="relative mx-auto h-[11.5rem] w-[11.5rem] sm:h-[13rem] sm:w-[13rem]" aria-hidden>
      <div className="marketing-orbit absolute inset-0 rounded-full border border-dashed border-[#C4B5FD]/35" />
      <div className="marketing-orbit-reverse absolute inset-3 rounded-full border border-[#A5C8FF]/30" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-full bg-white/90 px-4 py-3 text-center shadow-lg ring-1 ring-black/5 backdrop-blur-md">
          <p className="font-[family-name:var(--font-agency-display)] text-[1.35rem] font-semibold tracking-tight text-[#12131A] sm:text-[1.5rem]">
            360°
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B7BB8]">marketing</p>
        </div>
      </div>
      {GROWTH_360_LAYERS.map((label, i) => {
        const angle = (i / GROWTH_360_LAYERS.length) * 360 - 90;
        const rad = (angle * Math.PI) / 180;
        const r = 46;
        const x = 50 + r * Math.cos(rad);
        const y = 50 + r * Math.sin(rad);
        return (
          <span
            key={label}
            className="marketing-orbit-label absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-white/85 px-2 py-0.5 text-[8px] font-semibold text-[#6B6570] shadow-sm ring-1 ring-black/5 backdrop-blur-sm sm:text-[9px]"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

const PATH_STEPS = [
  { title: "Get seen", sub: "Right people notice you", icon: "◎" },
  { title: "Get trusted", sub: "Your brand feels real", icon: "♡" },
  { title: "Get action", sub: "Calls · bookings · walk-ins", icon: "→" },
] as const;

function SceneVisual({ kind }: { kind: GrowthMarketingBlock["visual"] }) {
  const common = "h-full w-full";
  switch (kind) {
    case "floor":
      return (
        <svg className={common} viewBox="0 0 200 160" fill="none" aria-hidden>
          <rect x="20" y="90" width="160" height="50" rx="12" fill="#FFB4A2" fillOpacity="0.25" />
          <circle cx="60" cy="70" r="22" fill="#C4B5FD" fillOpacity="0.35" />
          <circle cx="100" cy="55" r="18" fill="#A5C8FF" fillOpacity="0.4" />
          <circle cx="140" cy="72" r="20" fill="#F5A3C7" fillOpacity="0.35" />
          <path d="M40 90h120" stroke="#12131A" strokeOpacity="0.15" strokeWidth="2" strokeDasharray="6 4" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={common} viewBox="0 0 200 160" fill="none" aria-hidden>
          <rect x="35" y="30" width="130" height="100" rx="14" fill="#C4B5FD" fillOpacity="0.2" stroke="#C4B5FD" strokeOpacity="0.4" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect
              key={i}
              x={48 + (i % 3) * 38}
              y={52 + Math.floor(i / 3) * 28}
              width="28"
              height="18"
              rx="4"
              fill={i === 2 ? "#C4B5FD" : "#12131A"}
              fillOpacity={i === 2 ? 0.5 : 0.08}
            />
          ))}
        </svg>
      );
    case "signal":
      return (
        <svg className={common} viewBox="0 0 200 160" fill="none" aria-hidden>
          <path d="M40 120 Q100 20 160 120" stroke="#A5C8FF" strokeWidth="3" strokeOpacity="0.5" />
          <circle cx="100" cy="80" r="30" fill="#A5C8FF" fillOpacity="0.25" />
          <path d="M85 80h30M100 65v30" stroke="#12131A" strokeOpacity="0.2" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "crew":
      return (
        <svg className={common} viewBox="0 0 200 160" fill="none" aria-hidden>
          <circle cx="70" cy="75" r="24" fill="#F5A3C7" fillOpacity="0.35" />
          <circle cx="100" cy="65" r="28" fill="#FFB4A2" fillOpacity="0.4" />
          <circle cx="130" cy="75" r="24" fill="#C4B5FD" fillOpacity="0.35" />
          <path d="M50 115c15-20 85-20 100 0" stroke="#12131A" strokeOpacity="0.12" strokeWidth="2" />
        </svg>
      );
    case "proof":
      return (
        <svg className={common} viewBox="0 0 200 160" fill="none" aria-hidden>
          <rect x="40" y="100" width="24" height="40" rx="4" fill="#86EFAC" fillOpacity="0.5" />
          <rect x="72" y="75" width="24" height="65" rx="4" fill="#A5C8FF" fillOpacity="0.5" />
          <rect x="104" y="55" width="24" height="85" rx="4" fill="#C4B5FD" fillOpacity="0.55" />
          <rect x="136" y="85" width="24" height="55" rx="4" fill="#FFB4A2" fillOpacity="0.5" />
          <path d="M35 140h130" stroke="#12131A" strokeOpacity="0.1" strokeWidth="2" />
        </svg>
      );
  }
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setVisible(true);
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function StoryBlock({ block, index }: { block: GrowthMarketingBlock; index: number }) {
  const { ref, visible } = useInView();
  const accent = growthBlockAccent(block);
  const flip = index % 2 === 1;

  return (
    <article
      ref={ref}
      className={`marketing-reveal ${visible ? "marketing-reveal-visible" : ""} overflow-hidden rounded-[1.35rem] bg-gradient-to-br ${accent.wash} p-[1px] shadow-[0_20px_50px_-30px_rgba(80,60,120,0.35)] ring-1 ${accent.ring}`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div className="rounded-[1.32rem] bg-white/75 p-4 backdrop-blur-md sm:p-5">
        <div className={`flex flex-col gap-4 ${flip ? "sm:flex-row-reverse" : "sm:flex-row"} sm:items-stretch`}>
          <div className="relative min-h-[7rem] flex-1 overflow-hidden rounded-2xl bg-white/50 ring-1 ring-black/[0.04] sm:max-w-[42%]">
            <SceneVisual kind={block.visual} />
          </div>

          <div className="flex flex-[1.2] flex-col justify-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8B8494]">Question</p>
            <h2 className="mt-1 font-[family-name:var(--font-agency-display)] text-[1.15rem] font-semibold leading-[1.2] tracking-tight text-[#12131A] sm:text-[1.35rem]">
              {block.question}
            </h2>

            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8B7BB8]">Bassik</p>
              <ul className="mt-2 space-y-2">
                {block.answerLines.map((line, i) => (
                  <li
                    key={line}
                    className="flex items-start gap-2.5 text-[13px] font-medium leading-snug text-[#12131A] sm:text-[14px]"
                    style={{ transitionDelay: `${i * 80}ms` }}
                  >
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${accent.dot} marketing-pulse-dot`}
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/60 p-3 ring-1 ring-black/[0.04]">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-md">
            <Image src={block.portrait} alt="" fill sizes="44px" className="object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium leading-snug text-[#4A4550]">&ldquo;{block.voice}&rdquo;</p>
            <p className="mt-1 text-[11px] font-semibold text-[#8B8494]">{block.voiceBy}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function logoSrc(brandId: string, logoPath?: string) {
  if (logoPath) return logoPath;
  if (brandId.startsWith("club-rogue")) return "/logos/club-rogue.png";
  return `/logos/${brandId}.png`;
}

export default function PublicMarketingHome({ talkUrl }: { talkUrl: string }) {
  const portfolio = getAgencyPortfolioBrands();

  return (
    <>
      <header className="relative isolate overflow-hidden px-4 pb-6 pt-1 sm:px-8 sm:pb-10">
        <SiriGlow />
        <div className="relative mx-auto max-w-lg text-center sm:max-w-2xl">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-[#12131A] px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
            <span className="text-[#C4B5FD]" aria-hidden>
              ✦
            </span>
            360° marketing
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-agency-display)] text-[clamp(1.85rem,7vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-[#12131A]">
            We care about your growth.
          </h1>
          <p className="mx-auto mt-2.5 max-w-md text-[14px] leading-relaxed text-[#6B6570] sm:text-[15px]">
            Clubs, restaurants, hotels, education & healthcare — one partner for the full circle.
          </p>
          <div className="mt-6">
            <Hero360Ring />
          </div>
        </div>
      </header>

      <section className="px-4 pb-6 sm:px-8" aria-label="How growth works">
        <div className="mx-auto grid max-w-lg grid-cols-3 gap-2 sm:max-w-2xl sm:gap-3">
          {PATH_STEPS.map((step, i) => (
            <div
              key={step.title}
              className="relative rounded-2xl border border-white/70 bg-white/65 p-3 text-center shadow-sm ring-1 ring-black/[0.04] backdrop-blur-md sm:p-4"
            >
              <span className="text-lg text-[#8B7BB8]" aria-hidden>
                {step.icon}
              </span>
              <p className="mt-1.5 font-[family-name:var(--font-agency-display)] text-[12px] font-semibold sm:text-[13px]">
                {step.title}
              </p>
              <p className="mt-0.5 text-[9px] leading-snug text-[#8B8494] sm:text-[10px]">{step.sub}</p>
              {i < PATH_STEPS.length - 1 ? (
                <span
                  className="pointer-events-none absolute -right-2 top-1/2 hidden -translate-y-1/2 text-[#C4B5FD]/60 sm:block"
                  aria-hidden
                >
                  →
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <main className="relative px-4 pb-10 sm:px-8 sm:pb-16">
        <div className="mx-auto flex max-w-lg flex-col gap-5 sm:max-w-2xl sm:gap-6">
          {GROWTH_MARKETING_BLOCKS.map((block, i) => (
            <StoryBlock key={block.id} block={block} index={i} />
          ))}
        </div>

        <section className="mx-auto mt-10 max-w-lg sm:max-w-2xl" aria-label="Trusted by">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B8494]">
            Trusted in Hyderabad
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {portfolio.slice(0, 8).map((brand) => (
              <div
                key={brand.id}
                className="flex h-9 items-center justify-center rounded-xl bg-[#12131A] px-3 shadow-sm ring-1 ring-black/10"
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
          <p className="mt-4 text-center text-[12px] leading-relaxed text-[#6B6570]">{GROWTH_PROOF_LINE}</p>
          <a
            href={talkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 hidden min-h-12 w-full items-center justify-center rounded-full bg-[#12131A] text-[15px] font-semibold text-white shadow-lg sm:inline-flex"
          >
            Talk to Bassik on WhatsApp
          </a>
        </section>
      </main>
    </>
  );
}
