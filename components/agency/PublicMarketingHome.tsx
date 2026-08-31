"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { GROWTH_360_LAYERS, GROWTH_PROOF_LINE } from "@/lib/bassik-growth";
import {
  BASSIK_FRIEND_CHAT,
  BASSIK_WE_HANDLE,
  getAgencyPortfolioBrands,
} from "@/lib/bassik-agency";

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

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setVisible(true);
      },
      { threshold, rootMargin: "0px 0px -6% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/** Friend voice opens the page — 360° marketing first. */
function FriendVoiceHero() {
  return (
    <header className="relative isolate overflow-hidden px-4 pb-8 pt-2 sm:px-8 sm:pb-12">
      <SiriGlow />
      <div className="relative mx-auto max-w-lg sm:max-w-xl">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C4B5FD] to-[#A5C8FF] text-[13px] font-bold text-white shadow-md ring-2 ring-white"
            aria-hidden
          >
            B
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-[#8B8494]">Bassik</p>
            <div className="marketing-voice-glow mt-1 inline-block max-w-[95%] rounded-[1.25rem] rounded-tl-md bg-white/90 px-4 py-3 shadow-md ring-1 ring-[#C4B5FD]/30 backdrop-blur-md">
              <p className="font-[family-name:var(--font-agency-display)] text-[clamp(1.35rem,5.5vw,1.75rem)] font-semibold leading-tight tracking-tight text-[#12131A]">
                360° marketing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function StruggleSection() {
  const { ref, visible } = useInView();
  return (
    <section
      ref={ref}
      className={`marketing-reveal ${visible ? "marketing-reveal-visible" : ""} px-4 pb-8 sm:px-8`}
      aria-labelledby="struggle-heading"
    >
      <div className="mx-auto max-w-lg sm:max-w-xl">
        <h1
          id="struggle-heading"
          className="font-[family-name:var(--font-agency-display)] text-[clamp(1.5rem,6vw,2.1rem)] font-semibold leading-[1.15] tracking-[-0.03em] text-[#12131A]"
        >
          Stuck between your business and marketing?
        </h1>
        <p className="mt-3 text-[clamp(1.05rem,4vw,1.25rem)] font-semibold leading-snug text-[#6B6570]">
          Leave the marketing to us.
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-[#8B8494]">
          You run the room, the kitchen, the team. We run everything that brings people in.
        </p>
      </div>
    </section>
  );
}

const HANDLE_ICONS = ["◎", "▣", "↗", "◆", "☎", "→"] as const;

function WeHandleSection() {
  const { ref, visible } = useInView();
  return (
    <section
      ref={ref}
      className={`marketing-reveal ${visible ? "marketing-reveal-visible" : ""} px-4 pb-10 sm:px-8`}
      aria-labelledby="we-handle-heading"
    >
      <div className="mx-auto max-w-lg rounded-[1.35rem] bg-gradient-to-br from-[#F3EEFF]/90 to-[#FFF5F2]/80 p-[1px] shadow-sm ring-1 ring-[#C4B5FD]/25 sm:max-w-xl">
        <div className="rounded-[1.32rem] bg-white/75 p-5 backdrop-blur-md sm:p-6">
          <h2
            id="we-handle-heading"
            className="font-[family-name:var(--font-agency-display)] text-[1.15rem] font-semibold text-[#12131A] sm:text-[1.25rem]"
          >
            We handle
          </h2>
          <ul className="mt-4 space-y-3">
            {BASSIK_WE_HANDLE.map((line, i) => (
              <li
                key={line}
                className="flex items-center gap-3 border-b border-[#E6E1E8]/60 pb-3 last:border-0 last:pb-0"
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#12131A] text-[12px] text-[#C4B5FD]"
                  aria-hidden
                >
                  {HANDLE_ICONS[i % HANDLE_ICONS.length]}
                </span>
                <span className="text-[14px] font-medium text-[#12131A] sm:text-[15px]">{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-center text-[12px] font-semibold text-[#8B7BB8]">
            You focus on the business → we focus on growth
          </p>
        </div>
      </div>

      <div className="mx-auto mt-6 flex max-w-lg flex-wrap justify-center gap-1.5 sm:max-w-xl">
        {GROWTH_360_LAYERS.map((label) => (
          <span
            key={label}
            className="rounded-full border border-[#E6E1E8] bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-[#6B6570] ring-1 ring-black/[0.03]"
          >
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}

function FriendChatSection({ talkUrl }: { talkUrl: string }) {
  const { ref, visible } = useInView(0.08);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setShown(1);
    let count = 1;
    const interval = window.setInterval(() => {
      count += 1;
      if (count >= BASSIK_FRIEND_CHAT.length) {
        setShown(BASSIK_FRIEND_CHAT.length);
        window.clearInterval(interval);
      } else {
        setShown(count);
      }
    }, 700);
    return () => window.clearInterval(interval);
  }, [visible]);

  return (
    <section
      ref={ref}
      className="px-4 pb-10 sm:px-8"
      aria-labelledby="chat-heading"
    >
      <div className="mx-auto max-w-lg sm:max-w-xl">
        <p id="chat-heading" className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B8494]">
          Overheard
        </p>
        <p className="mt-1 font-[family-name:var(--font-agency-display)] text-[1.1rem] font-semibold text-[#12131A] sm:text-[1.2rem]">
          Two friends. One owns the place.
        </p>

        <div className="mt-5 space-y-3 rounded-[1.35rem] border border-[#E6E1E8]/80 bg-white/50 p-4 ring-1 ring-black/[0.03] backdrop-blur-sm sm:p-5">
          {BASSIK_FRIEND_CHAT.slice(0, shown).map((msg, i) => {
            const isRiya = msg.from === "riya";
            return (
              <div
                key={i}
                className={`marketing-chat-in flex ${isRiya ? "justify-end" : "justify-start"}`}
                style={{ animationDelay: "0ms" }}
              >
                <div
                  className={`max-w-[88%] rounded-[1.1rem] px-3.5 py-2.5 sm:max-w-[85%] ${
                    isRiya
                      ? "rounded-br-md bg-[#12131A] text-white"
                      : "rounded-bl-md bg-white text-[#12131A] shadow-sm ring-1 ring-black/[0.06]"
                  }`}
                >
                  {!isRiya && i === 0 ? (
                    <p className="mb-0.5 text-[10px] font-semibold text-[#8B8494]">Arjun · owns a spot</p>
                  ) : null}
                  {isRiya && i === 1 ? (
                    <p className="mb-0.5 text-[10px] font-semibold text-white/50">Riya</p>
                  ) : null}
                  <p className="text-[13px] leading-snug sm:text-[14px]">{msg.text}</p>
                </div>
              </div>
            );
          })}
        </div>

        {shown >= BASSIK_FRIEND_CHAT.length ? (
          <div className="marketing-chat-in mt-6 text-center">
            <p className="text-[13px] text-[#6B6570]">Sound like your week?</p>
            <a
              href={talkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#12131A] px-6 text-[15px] font-semibold text-white shadow-lg sm:w-auto sm:min-w-[16rem]"
            >
              Hi Bassik — let&apos;s talk
            </a>
          </div>
        ) : null}
      </div>
    </section>
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
      <FriendVoiceHero />
      <StruggleSection />
      <WeHandleSection />
      <FriendChatSection talkUrl={talkUrl} />

      <section className="border-t border-[#E6E1E8]/70 px-4 pb-10 pt-8 sm:px-8 sm:pb-16" aria-label="Trusted by">
        <div className="mx-auto max-w-lg sm:max-w-xl">
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
        </div>
      </section>
    </>
  );
}
