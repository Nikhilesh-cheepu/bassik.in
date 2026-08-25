"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import {
  GROW_STACK,
  AGENCY_PROOF_LINE,
  bassikGrowNumberWhatsAppUrl,
  bassikGrowShortWhatsAppUrl,
  getAgencyPortfolioBrands,
} from "@/lib/bassik-agency";

type Step = "hook" | "hi" | "skip" | "done";

const TRUST_POINTS = [
  "We’re here to grow your business — not just fill the feed.",
  "Full 360° marketing: story, shoots, content, ads, leads.",
  "Lead generation + conversion so interest becomes footfall.",
  "You run the floor. We handle the rest.",
] as const;

function logoSrc(brandId: string, override?: string) {
  if (override) return override;
  if (brandId.startsWith("club-rogue")) return "/logos/club-rogue.png";
  return `/logos/${brandId}.png`;
}

function SiriGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute -left-[20%] -top-[25%] h-[65%] w-[70%] rounded-full opacity-80 blur-[80px]"
        style={{ background: "radial-gradient(circle, #FFB4A2 0%, transparent 70%)" }}
      />
      <div
        className="absolute -right-[12%] top-[0%] h-[60%] w-[60%] rounded-full opacity-75 blur-[90px]"
        style={{ background: "radial-gradient(circle, #C4B5FD 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-[-5%] left-[20%] h-[45%] w-[55%] rounded-full opacity-70 blur-[80px]"
        style={{ background: "radial-gradient(circle, #A5C8FF 0%, transparent 70%)" }}
      />
      <div
        className="absolute left-[35%] top-[40%] h-[35%] w-[40%] rounded-full opacity-55 blur-[70px]"
        style={{ background: "radial-gradient(circle, #F5A3C7 0%, transparent 70%)" }}
      />
    </div>
  );
}

function digitsOnlyPhone(raw: string) {
  return raw.replace(/\D/g, "").slice(-10);
}

export default function GrowLeadLanding() {
  const portfolio = getAgencyPortfolioBrands();
  const shortWa = bassikGrowShortWhatsAppUrl();

  const [step, setStep] = useState<Step>("hook");
  const [phone, setPhone] = useState("");
  const [showNumber, setShowNumber] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waHref, setWaHref] = useState(shortWa);

  function sayHi() {
    setError(null);
    setWaHref(shortWa);
    window.open(shortWa, "_blank", "noopener,noreferrer");
    setStep("done");
  }

  function submitNumber(e: FormEvent) {
    e.preventDefault();
    const cleaned = digitsOnlyPhone(phone);
    if (cleaned.length !== 10) {
      setError("Enter a valid 10-digit WhatsApp number.");
      return;
    }
    setError(null);
    const href = bassikGrowNumberWhatsAppUrl(cleaned);
    setWaHref(href);
    window.open(href, "_blank", "noopener,noreferrer");
    setStep("done");
  }

  return (
    <div className="min-h-screen bg-[#F7F5F8] text-[#12131A] pb-[4.75rem] sm:pb-0">
      <nav className="relative z-20 mx-auto flex max-w-lg items-center justify-between px-4 py-4 sm:max-w-xl sm:px-6">
        <div className="flex items-center gap-2.5">
          {/* Dark chip so white Bassik mark stays visible */}
          <div className="relative h-9 w-9 overflow-hidden rounded-xl bg-[#12131A] shadow-sm ring-1 ring-black/10">
            <Image src="/logos/bassik.png" alt="" fill sizes="36px" className="object-contain p-1.5" priority />
          </div>
          <span className="font-[family-name:var(--font-agency-display)] text-[15px] font-semibold tracking-tight">
            Bassik
          </span>
        </div>
        <a
          href={shortWa}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] font-semibold text-[#6B6570] underline-offset-2 hover:text-[#12131A] hover:underline"
        >
          WhatsApp
        </a>
      </nav>

      <main className="relative isolate overflow-hidden px-4 pb-10 pt-2 sm:px-6">
        <SiriGlow />

        <div className="relative mx-auto max-w-lg sm:max-w-xl">
          {step === "hook" ? (
            <section aria-labelledby="grow-question">
              <p className="inline-flex rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold tracking-wide text-[#6B6570] shadow-sm ring-1 ring-black/5 backdrop-blur-md">
                360° marketing · leads · conversion
              </p>

              <h1
                id="grow-question"
                className="mt-5 font-[family-name:var(--font-agency-display)] text-[clamp(1.85rem,7vw,2.65rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-[#12131A]"
              >
                Stuck between marketing and growing the business?
              </h1>
              <p className="mt-4 text-[15px] leading-relaxed text-[#6B6570]">
                You run the floor. The feed, ads, and leads shouldn’t eat your week. Bassik handles end-to-end
                360° marketing — so you can rest and still grow.
              </p>

              <div className="mt-8 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setStep("hi")}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#12131A] px-6 text-[14px] font-semibold text-white transition hover:bg-black"
                >
                  Yes — that’s me
                </button>
                <button
                  type="button"
                  onClick={() => setStep("skip")}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#E6E1E8] bg-white/80 px-6 text-[14px] font-medium text-[#12131A] backdrop-blur-sm"
                >
                  Not right now
                </button>
              </div>

              <p className="mt-8 text-[12px] leading-relaxed text-[#8B8494]">{AGENCY_PROOF_LINE}</p>
              <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {portfolio.slice(0, 8).map((brand) => (
                  <li
                    key={brand.id}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#12131A]/15 bg-[#12131A] px-2.5 py-1.5"
                  >
                    <div className="relative h-5 w-5 overflow-hidden rounded-md bg-[#1C1B24]">
                      <Image
                        src={logoSrc(brand.id, brand.logoPath)}
                        alt=""
                        fill
                        sizes="20px"
                        className="object-contain p-0.5"
                      />
                    </div>
                    <span className="text-[10px] font-medium text-white/90">{brand.shortName}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {step === "hi" ? (
            <section aria-labelledby="grow-hi-title">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8B8494]">
                Step 2 of 2
              </p>
              <h2
                id="grow-hi-title"
                className="mt-2 font-[family-name:var(--font-agency-display)] text-[clamp(1.65rem,6vw,2.25rem)] font-semibold tracking-tight"
              >
                We’re here to grow your business.
              </h2>

              <ul className="mt-5 space-y-3">
                {TRUST_POINTS.map((point) => (
                  <li key={point} className="flex gap-3 text-[14px] leading-snug text-[#4A4550]">
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: "linear-gradient(135deg,#FFB4A2,#C4B5FD)" }}
                      aria-hidden
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-6 text-[13px] font-medium text-[#6B6570]">
                Tap Hi — we’ll handle the rest on WhatsApp.
              </p>

              <button
                type="button"
                onClick={sayHi}
                className="relative mt-4 inline-flex min-h-[3.5rem] w-full items-center justify-center overflow-hidden rounded-full bg-[#12131A] px-6 text-[17px] font-semibold text-white shadow-[0_16px_40px_-18px_rgba(80,60,140,0.55)] transition hover:bg-black"
              >
                <span
                  className="pointer-events-none absolute inset-0 opacity-40"
                  style={{
                    background:
                      "radial-gradient(120% 80% at 20% 0%, #FFB4A2 0%, transparent 45%), radial-gradient(100% 80% at 90% 100%, #C4B5FD 0%, transparent 50%)",
                  }}
                  aria-hidden
                />
                <span className="relative">Hi — let’s talk</span>
              </button>

              <p className="mt-3 text-center text-[12px] text-[#8B8494]">No forms. No spam. Just a real chat.</p>

              {!showNumber ? (
                <button
                  type="button"
                  onClick={() => setShowNumber(true)}
                  className="mt-5 w-full text-center text-[12px] font-medium text-[#8B8494] underline-offset-2 hover:text-[#12131A] hover:underline"
                >
                  Prefer we message you first? Share your number
                </button>
              ) : (
                <form onSubmit={submitNumber} className="mt-5 space-y-3 rounded-2xl border border-[#E6E1E8] bg-white/80 p-4">
                  <label className="block">
                    <span className="text-[12px] font-semibold text-[#4A4550]">WhatsApp number</span>
                    <input
                      type="tel"
                      name="phone"
                      autoComplete="tel"
                      inputMode="numeric"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1.5 w-full rounded-2xl border border-[#E6E1E8] bg-white px-4 py-3 text-[15px] text-[#12131A] outline-none ring-[#C4B5FD] placeholder:text-[#B0AAB6] focus:ring-2"
                      placeholder="10-digit mobile"
                    />
                  </label>
                  {error ? <p className="text-[13px] font-medium text-[#B42318]">{error}</p> : null}
                  <button
                    type="submit"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#12131A] px-5 text-[13px] font-semibold text-white"
                  >
                    Share number — we’ll get back
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setShowNumber(false);
                  setStep("hook");
                }}
                className="mt-5 w-full text-center text-[12px] font-medium text-[#8B8494] hover:text-[#12131A]"
              >
                ← Back
              </button>
            </section>
          ) : null}

          {step === "skip" ? (
            <section aria-labelledby="grow-skip-title">
              <h2
                id="grow-skip-title"
                className="font-[family-name:var(--font-agency-display)] text-[clamp(1.65rem,6vw,2.2rem)] font-semibold tracking-tight"
              >
                No pressure. We’re here when you are.
              </h2>

              <ul className="mt-6 grid grid-cols-2 gap-2.5">
                {GROW_STACK.map((item, i) => (
                  <li
                    key={item.title}
                    className="rounded-2xl border border-[#E6E1E8] bg-white/90 px-3.5 py-3.5 backdrop-blur-sm"
                  >
                    <span
                      className="inline-block h-1.5 w-7 rounded-full"
                      style={{
                        background:
                          i % 2 === 0
                            ? "linear-gradient(90deg,#FFB4A2,#F5A3C7)"
                            : "linear-gradient(90deg,#C4B5FD,#A5C8FF)",
                      }}
                    />
                    <h3 className="mt-2 font-[family-name:var(--font-agency-display)] text-[13px] font-semibold">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-[11px] leading-snug text-[#6B6570]">{item.body}</p>
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={sayHi}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#12131A] px-6 text-[14px] font-semibold text-white"
                >
                  Hi — let’s talk
                </button>
                <button
                  type="button"
                  onClick={() => setStep("hi")}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#E6E1E8] bg-white px-6 text-[14px] font-semibold text-[#12131A]"
                >
                  Actually yes, help me
                </button>
              </div>
            </section>
          ) : null}

          {step === "done" ? (
            <section aria-labelledby="grow-done-title" className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#C4B5FD] to-[#A5C8FF]">
                <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2
                id="grow-done-title"
                className="mt-5 font-[family-name:var(--font-agency-display)] text-[clamp(1.75rem,6.5vw,2.35rem)] font-semibold tracking-tight"
              >
                We’ll get back to you soon.
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-[#6B6570]">
                WhatsApp should be open with a short message ready — just send it. Our team will reply and take it
                from there.
              </p>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#12131A] px-6 text-[14px] font-semibold text-white"
              >
                Open WhatsApp again
              </a>
              <p className="mt-4 text-[12px] text-[#8B8494]">Usually same day · Hyderabad</p>
            </section>
          ) : null}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E6E1E8]/80 bg-[#F7F5F8]/95 px-3 py-2.5 backdrop-blur-xl sm:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          {step === "hook" || step === "skip" ? (
            <>
              <a
                href="/privacy"
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-[#E6E1E8] bg-white px-3 text-[12px] font-semibold text-[#12131A]"
              >
                Privacy
              </a>
              <button
                type="button"
                onClick={() => setStep("hi")}
                className="inline-flex min-h-11 flex-[1.35] items-center justify-center rounded-full bg-[#12131A] text-[13px] font-semibold text-white"
              >
                Yes, help me
              </button>
              <a
                href={shortWa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-[#E6E1E8] bg-white text-[13px] font-semibold"
              >
                WhatsApp
              </a>
            </>
          ) : step === "hi" ? (
            <>
              <a
                href="/privacy"
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-[#E6E1E8] bg-white px-3 text-[12px] font-semibold text-[#12131A]"
              >
                Privacy
              </a>
              <button
                type="button"
                onClick={sayHi}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-[#12131A] text-[14px] font-semibold text-white"
              >
                Hi — let’s talk
              </button>
            </>
          ) : (
            <>
              <a
                href="/privacy"
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-[#E6E1E8] bg-white px-3 text-[12px] font-semibold text-[#12131A]"
              >
                Privacy
              </a>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-[#12131A] text-[13px] font-semibold text-white"
              >
                Open WhatsApp
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
