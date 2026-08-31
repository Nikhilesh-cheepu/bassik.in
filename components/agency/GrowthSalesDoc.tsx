"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import PublicMarketingHome from "@/components/agency/PublicMarketingHome";
import GrowthPathCarousel from "@/components/agency/GrowthPathCarousel";
import {
  GROWTH_PATHS,
  GROWTH_PRIVATE_PRICES,
  GROWTH_VERTICALS,
  bassikGrowthWhatsAppUrl,
  getGrowthVertical,
  type GrowthPathId,
  type GrowthVerticalId,
} from "@/lib/bassik-growth";

type Props = {
  showPrivatePricing?: boolean;
};

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
        className="absolute -left-[20%] -top-[30%] h-[70%] w-[70%] rounded-full opacity-80 blur-[80px]"
        style={{ background: "radial-gradient(circle, #FFB4A2 0%, transparent 70%)" }}
      />
      <div
        className="absolute -right-[15%] top-[5%] h-[65%] w-[65%] rounded-full opacity-75 blur-[90px]"
        style={{ background: "radial-gradient(circle, #C4B5FD 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-[-10%] left-[25%] h-[50%] w-[55%] rounded-full opacity-70 blur-[80px]"
        style={{ background: "radial-gradient(circle, #A5C8FF 0%, transparent 70%)" }}
      />
      <div
        className="absolute left-[40%] top-[35%] h-[40%] w-[40%] rounded-full opacity-60 blur-[70px]"
        style={{ background: "radial-gradient(circle, #F5A3C7 0%, transparent 70%)" }}
      />
    </div>
  );
}

function IconEye({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconHeart({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBolt({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const STORY_STEPS = [
  {
    id: "see",
    title: "Get seen",
    body: "Right people notice you",
    Icon: IconEye,
    wash: "from-[#FFB4A2]/50 to-[#F5A3C7]/30",
  },
  {
    id: "trust",
    title: "Get trusted",
    body: "Your brand feels real",
    Icon: IconHeart,
    wash: "from-[#C4B5FD]/45 to-[#A5C8FF]/30",
  },
  {
    id: "act",
    title: "Get action",
    body: "Calls, bookings, walk-ins",
    Icon: IconBolt,
    wash: "from-[#A5C8FF]/45 to-[#C4B5FD]/30",
  },
] as const;

export default function GrowthSalesDoc({ showPrivatePricing = false }: Props) {
  const [verticalId, setVerticalId] = useState<GrowthVerticalId>("clubs");
  const talkUrl = bassikGrowthWhatsAppUrl();
  const vertical = getGrowthVertical(verticalId);
  const prices = GROWTH_PRIVATE_PRICES[verticalId];
  const partnerTalkUrl = bassikGrowthWhatsAppUrl(verticalId);

  if (!showPrivatePricing) {
    return (
      <div className="agency-home min-h-screen bg-[#F7F5F8] text-[#12131A] pb-[4rem] sm:pb-0">
        <nav className="relative z-20 mx-auto flex max-w-5xl items-center gap-2.5 px-4 py-3 sm:px-8 sm:py-4">
          <div className="relative h-8 w-8 overflow-hidden rounded-xl bg-white/90 shadow-sm ring-1 ring-black/10 backdrop-blur-md sm:h-9 sm:w-9">
            <Image
              src="/logos/bassik.png"
              alt="Bassik"
              fill
              sizes="36px"
              className="object-contain p-0.5 brightness-0"
              priority
            />
          </div>
          <span className="font-[family-name:var(--font-agency-display)] text-[14px] font-semibold tracking-tight sm:text-[15px]">
            Bassik
          </span>
        </nav>

        <PublicMarketingHome talkUrl={talkUrl} />

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E6E1E8]/80 bg-[#F7F5F8]/95 px-3 py-2.5 backdrop-blur-xl sm:hidden print:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-2">
            <Link
              href="/privacy"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-[#E6E1E8] bg-white px-3.5 text-[12px] font-semibold text-[#12131A]"
            >
              Privacy
            </Link>
            <a
              href={talkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-[#12131A] text-[13px] font-semibold text-white"
            >
              WhatsApp Bassik
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="agency-home min-h-screen bg-[#F7F5F8] text-[#12131A] pb-[4rem] sm:pb-0">
      <nav className="relative z-20 mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-8 sm:py-4">
        <div className="flex items-center gap-2.5">
          <div className="relative h-8 w-8 overflow-hidden rounded-xl bg-white/90 shadow-sm ring-1 ring-black/10 backdrop-blur-md sm:h-9 sm:w-9">
            <Image
              src="/logos/bassik.png"
              alt="Bassik"
              fill
              sizes="36px"
              className="object-contain p-0.5 brightness-0"
              priority
            />
          </div>
          <span className="font-[family-name:var(--font-agency-display)] text-[14px] font-semibold tracking-tight sm:text-[15px]">
            Bassik
          </span>
        </div>
        {showPrivatePricing ? (
          <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-[#8B8494]">Confidential</p>
        ) : null}
      </nav>

      <header className="relative isolate overflow-hidden px-4 pb-5 pt-2 sm:px-8 sm:pb-10 sm:pt-5">
        <SiriGlow />
        <div className="relative mx-auto max-w-5xl">
          <h1 className="mt-3 max-w-xl font-[family-name:var(--font-agency-display)] text-[1.9rem] font-semibold leading-[1.08] tracking-[-0.035em] text-[#12131A] sm:mt-4 sm:text-[clamp(2.35rem,7vw,3.6rem)]">
            Wanna grow your business?
          </h1>
          <p className="mt-2.5 max-w-md text-[14px] leading-snug text-[#6B6570] sm:mt-3 sm:text-[16px] sm:leading-relaxed">
            Bassik helps you get seen, trusted, and chosen — clubs, restaurants, hotels, education,
            healthcare. We&apos;re with you.
          </p>
        </div>
      </header>

      {/* Story map */}
      <section className="relative isolate px-4 pb-5 sm:px-8 sm:pb-8" aria-label="How growth works">
        <div className="relative mx-auto max-w-5xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8B8494]">
            The path
          </p>
          <ol className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
            {STORY_STEPS.map((step, i) => (
              <li key={step.id} className="relative">
                <div
                  className={`rounded-2xl border border-white/60 bg-gradient-to-br ${step.wash} p-3 shadow-sm ring-1 ring-black/5 backdrop-blur-md sm:p-4`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-[#12131A] shadow-sm sm:h-10 sm:w-10">
                    <step.Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <p className="mt-2.5 font-[family-name:var(--font-agency-display)] text-[13px] font-semibold sm:text-[15px]">
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-[#6B6570] sm:text-[12px]">{step.body}</p>
                </div>
                {i < STORY_STEPS.length - 1 ? (
                  <span
                    className="pointer-events-none absolute -right-1.5 top-1/2 z-[1] hidden -translate-y-1/2 text-[#C4B5FD] sm:block"
                    aria-hidden
                  >
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-center text-[12px] text-[#6B6570] sm:text-[13px]">
            Pick a package — we run this path with you.
          </p>
        </div>
      </section>

      <main>
        <section
          id="paths"
          className="relative isolate border-t border-[#E6E1E8]/70 px-4 py-6 sm:px-8 sm:py-12"
          aria-labelledby="paths-heading"
        >
          <SiriGlow />
          <div className="relative mx-auto max-w-5xl">
            <h2
              id="paths-heading"
              className="font-[family-name:var(--font-agency-display)] text-[1.4rem] font-semibold tracking-tight sm:text-[clamp(1.65rem,4vw,2.25rem)]"
            >
              Care · Growth · Revenue
            </h2>
            <p className="mt-1 text-[12px] text-[#6B6570] sm:text-[13px]">
              Clear deliverables — pick the path that fits your world.
            </p>

            <div className="mt-3.5 flex flex-wrap gap-1.5" role="tablist" aria-label="Industry">
              {GROWTH_VERTICALS.map((v) => {
                const active = v.id === verticalId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setVerticalId(v.id)}
                    className={`inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold backdrop-blur-md transition-colors sm:min-h-9 sm:gap-1.5 sm:px-3.5 sm:text-[13px] ${
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
            <p className="mt-2 max-w-lg text-[11px] leading-snug text-[#6B6570] sm:text-[13px]">
              {vertical.growthMeans}
            </p>

            <div className="mt-4 sm:mt-5">
              <GrowthPathCarousel verticalId={verticalId} prices={prices} />
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-[#E6E1E8] bg-white/80 p-3.5 backdrop-blur-md sm:p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B8494]">
                Pricing · {vertical.label}
              </p>
              <table className="mt-2 w-full min-w-[240px] text-left text-[12px] sm:text-[13px]">
                <thead>
                  <tr className="border-b border-[#E6E1E8] text-[#8B8494]">
                    <th className="py-1.5 pr-3 font-medium">Path</th>
                    <th className="py-1.5 font-medium">Retainer / mo</th>
                  </tr>
                </thead>
                <tbody>
                  {GROWTH_PATHS.map((path) => (
                    <tr key={path.id} className="border-b border-[#E6E1E8]/80">
                      <td className="py-2 pr-3 font-semibold">{path.name}</td>
                      <td className="py-2 font-[family-name:var(--font-agency-display)] font-semibold">
                        {prices[path.id as GrowthPathId]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[10px] text-[#8B8494]">Ad spend always client-paid, separate.</p>
            </div>
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E6E1E8]/80 bg-[#F7F5F8]/95 px-3 py-2.5 backdrop-blur-xl sm:hidden print:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <Link
            href="/privacy"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-[#E6E1E8] bg-white px-3.5 text-[12px] font-semibold text-[#12131A]"
          >
            Privacy
          </Link>
          <a
            href={partnerTalkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-[#12131A] text-[13px] font-semibold text-white"
          >
            WhatsApp Bassik
          </a>
        </div>
      </div>
    </div>
  );
}
