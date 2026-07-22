import type { ReactNode } from "react";
import Image from "next/image";
import {
  AGENCY_CONTACT_BODY,
  AGENCY_CONTACT_TITLE,
  AGENCY_HERO_SUPPORT,
  AGENCY_HOSPITALITY_BODY,
  AGENCY_HOSPITALITY_HEADING,
  AGENCY_HOSPITALITY_TITLE,
  AGENCY_SERVICES,
  AGENCY_SERVICES_HEADING,
  AGENCY_SERVICES_TITLE,
  AGENCY_STEPS,
  AGENCY_STEPS_HEADING,
  AGENCY_STEPS_TITLE,
  AGENCY_TAGLINE,
  AGENCY_TRUST,
  AGENCY_TRUST_HEADING,
  AGENCY_TRUST_TITLE,
  AGENCY_VERTICALS,
  AGENCY_VERTICALS_HEADING,
  AGENCY_VERTICALS_TITLE,
  AGENCY_WORK_HEADING,
  AGENCY_WORK_TITLE,
  bassikAgencyWhatsAppUrl,
  bassikInvestWhatsAppUrl,
  getAgencyPortfolioBrands,
  type AgencyServiceId,
  type AgencyVerticalId,
} from "@/lib/bassik-agency";

function logoPath(brandId: string, override?: string) {
  if (override) return override;
  if (brandId.startsWith("club-rogue")) return "/logos/club-rogue.png";
  return `/logos/${brandId}.png`;
}

function IconAdsAnywhere({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7.5h11.5a2 2 0 0 1 2 2V18a1.5 1.5 0 0 1-1.5 1.5H7A3 3 0 0 1 4 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M15.5 9.5 20 7v10l-4.5-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 11.5h5M8 14.5h3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconCreatives({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="m8 15 2.4-3.2 2.1 2.4L15.5 10 18 15" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="9" cy="9" r="1.2" fill="currentColor" />
    </svg>
  );
}

function IconSocial({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="5.5" cy="7" r="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="18.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.5" cy="17.5" r="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M7.2 8.3 9.8 10.4M14.2 10.5l2.6-1.8M14.1 13.6l2.1 2.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSearch({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="m16 16 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconStory({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 6.5A2.5 2.5 0 0 1 7.5 4H16a3 3 0 0 1 3 3v10.5a.5.5 0 0 1-.8.4L15 15.5H7.5A2.5 2.5 0 0 1 5 13V6.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M9 9h6M9 12h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconCompetitors({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 19V9.5l3.5 2L12 6l3.5 5.5L19 9.5V19" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4 19h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconPro({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3.5 14.2 8l4.8.5-3.6 3.3.1 4.7L12 14.8 8.5 16.5l.1-4.7L5 8.5 9.8 8 12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconGym({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3.5 9.5v5M6 8v8M9.5 10.5v3M14.5 10.5v3M18 8v8M20.5 9.5v5M6 12h12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconFnb({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 4v7a2 2 0 1 0 4 0V4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 13v7M16 4v16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14.5 4c1.5 0 2.5 1.2 2.5 3S16 10 14.5 10" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconNightlife({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 18c0-4 2.5-6.5 4-8 1.5 1.5 4 4 4 8H8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10 8.5c.5-1.5 1.3-2.8 2-3.5.7.7 1.5 2 2 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 20h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconLocal({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="11" r="2.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

const SERVICE_ICONS: Record<AgencyServiceId, (p: { className?: string }) => ReactNode> = {
  ads: IconAdsAnywhere,
  creatives: IconCreatives,
  social: IconSocial,
  seo: IconSearch,
};

const TRUST_ICONS = {
  story: IconStory,
  competitors: IconCompetitors,
  pro: IconPro,
} as const;

const VERTICAL_ICONS: Record<AgencyVerticalId, (p: { className?: string }) => ReactNode> = {
  gym: IconGym,
  fnb: IconFnb,
  nightlife: IconNightlife,
  local: IconLocal,
};

export default function AgencyHome() {
  const portfolio = getAgencyPortfolioBrands();
  const talkUrl = bassikAgencyWhatsAppUrl();
  const investUrl = bassikInvestWhatsAppUrl();

  return (
    <div className="agency-home min-h-screen bg-[#07060a] text-[#f4efe6]">
      <header className="relative isolate overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(120% 80% at 50% -10%, rgba(212,175,106,0.22), transparent 55%), radial-gradient(90% 60% at 100% 20%, rgba(120,80,40,0.18), transparent 50%), linear-gradient(180deg, #12101a 0%, #07060a 72%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          aria-hidden
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative mx-auto flex min-h-[100svh] max-w-5xl flex-col justify-center px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14">
          <div className="mb-10 flex items-center gap-3 sm:mb-12">
            <div className="relative h-11 w-11 overflow-hidden rounded-xl ring-1 ring-[#d4af6a]/35 sm:h-12 sm:w-12">
              <Image src="/logos/bassik.png" alt="" fill sizes="48px" className="object-contain p-1" priority />
            </div>
            <p className="font-[family-name:var(--font-agency-display)] text-lg font-semibold tracking-[0.08em] text-[#d4af6a] sm:text-xl">
              DIGITAL MARKETING AGENCY
            </p>
          </div>

          <h1 className="max-w-3xl font-[family-name:var(--font-agency-display)] text-[clamp(2.6rem,9vw,5.2rem)] font-semibold leading-[0.92] tracking-[-0.035em] text-[#faf6ee]">
            Bassik
          </h1>
          <p className="mt-4 max-w-2xl font-[family-name:var(--font-agency-display)] text-[clamp(1.15rem,3.2vw,1.75rem)] font-medium leading-snug tracking-[-0.02em] text-[#d4af6a]">
            {AGENCY_TAGLINE}
          </p>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-[#b7b0a4] sm:text-base">
            {AGENCY_HERO_SUPPORT}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href={talkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#d4af6a] px-6 text-[14px] font-semibold text-[#140f0a] transition hover:bg-[#e0c07e]"
            >
              Start a conversation
            </a>
            <a
              href="#edge"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-6 text-[14px] font-medium text-[#e8e2d6] transition hover:border-[#d4af6a]/45 hover:text-white"
            >
              How we work
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="border-t border-white/[0.06] px-5 py-14 sm:px-8 sm:py-16" aria-labelledby="services-heading">
          <div className="mx-auto max-w-5xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4af6a]/80">
              {AGENCY_SERVICES_HEADING}
            </p>
            <h2
              id="services-heading"
              className="mt-3 max-w-xl font-[family-name:var(--font-agency-display)] text-3xl font-semibold tracking-tight text-[#faf6ee] sm:text-[2.35rem]"
            >
              {AGENCY_SERVICES_TITLE}
            </h2>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2">
              {AGENCY_SERVICES.map((s) => {
                const Icon = SERVICE_ICONS[s.id];
                return (
                  <li
                    key={s.id}
                    className="flex gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-4 sm:px-5 sm:py-5"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d4af6a]/12 text-[#d4af6a] ring-1 ring-[#d4af6a]/25">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-[family-name:var(--font-agency-display)] text-lg font-semibold text-[#f4efe6]">
                        {s.title}
                      </h3>
                      <p className="mt-1 text-[13px] leading-snug text-[#9e968a]">{s.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section
          id="edge"
          className="border-t border-white/[0.06] bg-[#0c0b10] px-5 py-14 sm:px-8 sm:py-16"
          aria-labelledby="edge-heading"
        >
          <div className="mx-auto max-w-5xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4af6a]/80">
              {AGENCY_TRUST_HEADING}
            </p>
            <h2
              id="edge-heading"
              className="mt-3 max-w-xl font-[family-name:var(--font-agency-display)] text-3xl font-semibold tracking-tight text-[#faf6ee] sm:text-[2.35rem]"
            >
              {AGENCY_TRUST_TITLE}
            </h2>
            <ul className="mt-10 grid gap-4 sm:grid-cols-3">
              {AGENCY_TRUST.map((item) => {
                const Icon = TRUST_ICONS[item.id];
                return (
                  <li key={item.id} className="rounded-2xl border border-white/[0.08] bg-black/30 px-4 py-5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4af6a]/12 text-[#d4af6a] ring-1 ring-[#d4af6a]/25">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-[family-name:var(--font-agency-display)] text-lg font-semibold text-[#f4efe6]">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-snug text-[#9e968a]">{item.body}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="border-t border-white/[0.06] px-5 py-14 sm:px-8 sm:py-16" aria-labelledby="verticals-heading">
          <div className="mx-auto max-w-5xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4af6a]/80">
              {AGENCY_VERTICALS_HEADING}
            </p>
            <h2
              id="verticals-heading"
              className="mt-3 max-w-xl font-[family-name:var(--font-agency-display)] text-3xl font-semibold tracking-tight text-[#faf6ee] sm:text-[2.35rem]"
            >
              {AGENCY_VERTICALS_TITLE}
            </h2>
            <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
              {AGENCY_VERTICALS.map((v) => {
                const Icon = VERTICAL_ICONS[v.id];
                return (
                  <li
                    key={v.id}
                    className="flex flex-col items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-5"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4af6a]/12 text-[#d4af6a] ring-1 ring-[#d4af6a]/25">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-[family-name:var(--font-agency-display)] text-[15px] font-semibold text-[#f4efe6]">
                        {v.title}
                      </h3>
                      <p className="mt-1 text-[12px] leading-snug text-[#9e968a]">{v.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section
          id="work"
          className="border-t border-white/[0.06] bg-[#0c0b10] px-5 py-14 sm:px-8 sm:py-16"
          aria-labelledby="clients-heading"
        >
          <div className="mx-auto max-w-5xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4af6a]/80">
              {AGENCY_WORK_HEADING}
            </p>
            <h2
              id="clients-heading"
              className="mt-3 max-w-xl font-[family-name:var(--font-agency-display)] text-3xl font-semibold tracking-tight text-[#faf6ee] sm:text-[2.35rem]"
            >
              {AGENCY_WORK_TITLE}
            </h2>
            <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
              {portfolio.map((brand) => (
                <li
                  key={brand.id}
                  className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/40 px-3 py-5"
                >
                  <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-white/[0.04] ring-1 ring-white/10">
                    <Image
                      src={logoPath(brand.id, brand.logoPath)}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-contain p-1.5"
                    />
                  </div>
                  <span className="text-center text-[12px] font-medium text-[#cfc7b8]">{brand.shortName}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-white/[0.06] px-5 py-14 sm:px-8 sm:py-16" aria-labelledby="process-heading">
          <div className="mx-auto max-w-5xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4af6a]/80">
              {AGENCY_STEPS_HEADING}
            </p>
            <h2
              id="process-heading"
              className="mt-3 font-[family-name:var(--font-agency-display)] text-3xl font-semibold tracking-tight text-[#faf6ee] sm:text-[2.35rem]"
            >
              {AGENCY_STEPS_TITLE}
            </h2>
            <ol className="mt-10 grid gap-4 sm:grid-cols-3">
              {AGENCY_STEPS.map((s) => (
                <li key={s.step} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-5">
                  <p className="font-[family-name:var(--font-agency-display)] text-sm font-semibold tracking-[0.18em] text-[#d4af6a]">
                    {s.step}
                  </p>
                  <h3 className="mt-2 font-[family-name:var(--font-agency-display)] text-xl font-semibold text-[#f4efe6]">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-[13px] text-[#9e968a]">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          className="border-t border-white/[0.06] px-5 py-14 sm:px-8 sm:py-16"
          aria-labelledby="hospitality-heading"
        >
          <div className="mx-auto max-w-5xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4af6a]/80">
              {AGENCY_HOSPITALITY_HEADING}
            </p>
            <h2
              id="hospitality-heading"
              className="mt-3 max-w-xl font-[family-name:var(--font-agency-display)] text-3xl font-semibold tracking-tight text-[#faf6ee] sm:text-[2.35rem]"
            >
              {AGENCY_HOSPITALITY_TITLE}
            </h2>
            <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[#9e968a]">{AGENCY_HOSPITALITY_BODY}</p>
            <a
              href={investUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full border border-[#d4af6a]/50 px-6 text-[14px] font-semibold text-[#d4af6a] transition hover:bg-[#d4af6a]/10"
            >
              Discuss a partnership
            </a>
          </div>
        </section>

        <section
          id="contact"
          className="border-t border-white/[0.06] bg-[#0c0b10] px-5 py-16 sm:px-8 sm:py-20"
          aria-labelledby="contact-heading"
        >
          <div className="mx-auto max-w-5xl text-center">
            <h2
              id="contact-heading"
              className="font-[family-name:var(--font-agency-display)] text-3xl font-semibold tracking-tight text-[#faf6ee] sm:text-[2.35rem]"
            >
              {AGENCY_CONTACT_TITLE}
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-[#9e968a]">
              {AGENCY_CONTACT_BODY}
            </p>
            <a
              href={talkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#d4af6a] px-8 text-[15px] font-semibold text-[#140f0a] transition hover:bg-[#e0c07e]"
            >
              WhatsApp Bassik
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-[family-name:var(--font-agency-display)] text-sm font-semibold tracking-wide text-[#cfc7b8]">
            Bassik
          </p>
          <p className="text-[12px] text-[#6f685e]">Premium digital marketing agency</p>
        </div>
      </footer>
    </div>
  );
}
