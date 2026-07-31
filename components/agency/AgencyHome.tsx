import type { ReactNode } from "react";
import Image from "next/image";
import {
  AGENCY_CONTACT_BODY,
  AGENCY_CONTACT_TITLE,
  AGENCY_HERO_SUPPORT,
  AGENCY_HOSPITALITY_BODY,
  AGENCY_HOSPITALITY_HEADING,
  AGENCY_HOSPITALITY_TITLE,
  AGENCY_PACKAGES,
  AGENCY_PACKAGES_HEADING,
  AGENCY_PACKAGES_SUPPORT,
  AGENCY_PACKAGES_TITLE,
  AGENCY_SERVICES,
  AGENCY_SERVICES_HEADING,
  AGENCY_SERVICES_TITLE,
  AGENCY_STEPS,
  AGENCY_STEPS_HEADING,
  AGENCY_STEPS_TITLE,
  AGENCY_TAGLINE,
  AGENCY_VERTICALS,
  AGENCY_VERTICALS_HEADING,
  AGENCY_VERTICALS_TITLE,
  AGENCY_WORK_HEADING,
  AGENCY_WORK_TITLE,
  bassikAgencyWhatsAppUrl,
  bassikAuditWhatsAppUrl,
  bassikInvestWhatsAppUrl,
  bassikPackageWhatsAppUrl,
  getAgencyPortfolioBrands,
  type AgencyPackageId,
  type AgencyServiceId,
  type AgencyVerticalId,
} from "@/lib/bassik-agency";

function logoPath(brandId: string, override?: string) {
  if (override) return override;
  if (brandId.startsWith("club-rogue")) return "/logos/club-rogue.png";
  return `/logos/${brandId}.png`;
}

function IconContent({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 9.5h2.5A1.5 1.5 0 0 1 20 11v7.5A1.5 1.5 0 0 1 18.5 20H16" stroke="currentColor" strokeWidth="1.6" />
      <path d="m8.5 11.5 4 2.5-4 2.5v-5Z" fill="currentColor" />
    </svg>
  );
}

function IconSocial({ className = "h-5 w-5" }: { className?: string }) {
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

function IconAds({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7.5h11.5a2 2 0 0 1 2 2V18a1.5 1.5 0 0 1-1.5 1.5H7A3 3 0 0 1 4 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M15.5 9.5 20 7v10l-4.5-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function IconDiscovery({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="m16 16 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconGym({ className = "h-5 w-5" }: { className?: string }) {
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

function IconFnb({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 4v7a2 2 0 1 0 4 0V4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 13v7M16 4v16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconNightlife({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 18c0-4 2.5-6.5 4-8 1.5 1.5 4 4 4 8H8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M7 20h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconLocal({ className = "h-5 w-5" }: { className?: string }) {
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

function IconCheck({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const SERVICE_ICONS: Record<AgencyServiceId, (p: { className?: string }) => ReactNode> = {
  content: IconContent,
  social: IconSocial,
  ads: IconAds,
  discovery: IconDiscovery,
};

const VERTICAL_ICONS: Record<AgencyVerticalId, (p: { className?: string }) => ReactNode> = {
  gym: IconGym,
  fnb: IconFnb,
  nightlife: IconNightlife,
  local: IconLocal,
};

function packageCardClass(id: AgencyPackageId, highlighted: boolean) {
  if (highlighted) {
    return "relative flex flex-col rounded-2xl border border-[#d4af6a]/55 bg-gradient-to-b from-[#d4af6a]/16 to-[rgba(212,175,106,0.04)] px-5 py-6 shadow-[0_0_0_1px_rgba(212,175,106,0.12)] sm:px-6 sm:py-7";
  }
  if (id === "starter") {
    return "relative flex flex-col rounded-2xl border border-white/12 bg-white/[0.03] px-5 py-6 sm:px-6 sm:py-7";
  }
  return "relative flex flex-col rounded-2xl border border-white/[0.08] bg-black/25 px-5 py-6 sm:px-6 sm:py-7";
}

export default function AgencyHome() {
  const portfolio = getAgencyPortfolioBrands();
  const talkUrl = bassikAgencyWhatsAppUrl();
  const auditUrl = bassikAuditWhatsAppUrl();
  const investUrl = bassikInvestWhatsAppUrl();
  const contentPkg = AGENCY_PACKAGES.find((p) => p.id === "content")!;

  return (
    <div className="agency-home min-h-screen bg-[#07060a] text-[#f4efe6] pb-[4.75rem] sm:pb-0">
      <header className="relative isolate overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(120% 80% at 50% -10%, rgba(212,175,106,0.22), transparent 55%), radial-gradient(70% 50% at 0% 40%, rgba(120,80,40,0.16), transparent 50%), linear-gradient(180deg, #12101a 0%, #07060a 78%)",
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

        <div className="relative mx-auto flex min-h-[100svh] max-w-5xl flex-col justify-center px-4 pb-14 pt-8 sm:px-8 sm:pb-20 sm:pt-14">
          <div className="mb-8 flex items-center gap-3 sm:mb-10">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl ring-1 ring-[#d4af6a]/35 sm:h-12 sm:w-12">
              <Image src="/logos/bassik.png" alt="" fill sizes="48px" className="object-contain p-1" priority />
            </div>
            <p className="font-[family-name:var(--font-agency-display)] text-[13px] font-semibold tracking-[0.14em] text-[#d4af6a] sm:text-base sm:tracking-[0.1em]">
              BASSIK MARKETING
            </p>
          </div>

          <h1 className="max-w-3xl font-[family-name:var(--font-agency-display)] text-[clamp(2.75rem,11vw,5.2rem)] font-semibold leading-[0.9] tracking-[-0.035em] text-[#faf6ee]">
            Bassik
          </h1>
          <p className="mt-4 max-w-xl font-[family-name:var(--font-agency-display)] text-[clamp(1.2rem,4.2vw,1.85rem)] font-medium leading-snug tracking-[-0.02em] text-[#d4af6a]">
            {AGENCY_TAGLINE}
          </p>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#b7b0a4] sm:text-base">
            {AGENCY_HERO_SUPPORT}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap sm:items-center">
            <a
              href="#packages"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#d4af6a] px-6 text-[14px] font-semibold text-[#140f0a] transition hover:bg-[#e0c07e] sm:w-auto"
            >
              See packages
            </a>
            <a
              href={bassikPackageWhatsAppUrl(contentPkg.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#d4af6a]/45 px-6 text-[14px] font-medium text-[#e8e2d6] transition hover:border-[#d4af6a] hover:text-white sm:w-auto"
            >
              Ask about Content / reels
            </a>
          </div>

          <p className="mt-6 text-[12px] text-[#7a7268] sm:text-[13px]">
            From <span className="text-[#cfc7b8]">₹15,000/mo</span> · Content shoots & reels from{" "}
            <span className="text-[#d4af6a]">₹35,000/mo</span>
          </p>
        </div>
      </header>

      <main>
        <section
          id="packages"
          className="border-t border-white/[0.06] px-4 py-12 sm:px-8 sm:py-16"
          aria-labelledby="packages-heading"
        >
          <div className="mx-auto max-w-5xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4af6a]/80">
              {AGENCY_PACKAGES_HEADING}
            </p>
            <h2
              id="packages-heading"
              className="mt-3 max-w-xl font-[family-name:var(--font-agency-display)] text-[1.85rem] font-semibold leading-tight tracking-tight text-[#faf6ee] sm:text-[2.35rem]"
            >
              {AGENCY_PACKAGES_TITLE}
            </h2>
            <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-[#9e968a]">
              {AGENCY_PACKAGES_SUPPORT}
            </p>

            <ul className="mt-8 grid gap-4 lg:grid-cols-2">
              {AGENCY_PACKAGES.map((pkg) => (
                <li key={pkg.id} className={packageCardClass(pkg.id, pkg.highlighted)}>
                  {pkg.badge ? (
                    <span
                      className={
                        pkg.highlighted
                          ? "absolute -top-2.5 left-5 inline-flex rounded-full bg-[#d4af6a] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#140f0a]"
                          : "absolute -top-2.5 left-5 inline-flex rounded-full border border-white/15 bg-[#12101a] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#cfc7b8]"
                      }
                    >
                      {pkg.badge}
                    </span>
                  ) : null}

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-[family-name:var(--font-agency-display)] text-2xl font-semibold text-[#faf6ee]">
                        {pkg.name}
                      </h3>
                      <p className="mt-2 text-[13px] leading-snug text-[#b7b0a4]">{pkg.outcome}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-[family-name:var(--font-agency-display)] text-xl font-semibold text-[#d4af6a] sm:text-2xl">
                        {pkg.priceLabel}
                      </p>
                      <p className="text-[11px] text-[#7a7268]">{pkg.priceNote}</p>
                    </div>
                  </div>

                  <ul className="mt-5 space-y-2.5 border-t border-white/[0.08] pt-5">
                    {pkg.includes.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-[13px] text-[#cfc7b8]">
                        <span
                          className={
                            pkg.highlighted
                              ? "mt-0.5 text-[#d4af6a]"
                              : "mt-0.5 text-[#8a8174]"
                          }
                        >
                          <IconCheck />
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <a
                    href={bassikPackageWhatsAppUrl(pkg.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={
                      pkg.highlighted
                        ? "mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#d4af6a] px-5 text-[14px] font-semibold text-[#140f0a] transition hover:bg-[#e0c07e]"
                        : "mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/15 px-5 text-[14px] font-semibold text-[#e8e2d6] transition hover:border-[#d4af6a]/45 hover:text-white"
                    }
                  >
                    {pkg.cta}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          className="border-t border-white/[0.06] bg-[#0c0b10] px-4 py-12 sm:px-8 sm:py-16"
          aria-labelledby="services-heading"
        >
          <div className="mx-auto max-w-5xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4af6a]/80">
              {AGENCY_SERVICES_HEADING}
            </p>
            <h2
              id="services-heading"
              className="mt-3 max-w-xl font-[family-name:var(--font-agency-display)] text-[1.85rem] font-semibold leading-tight tracking-tight text-[#faf6ee] sm:text-[2.35rem]"
            >
              {AGENCY_SERVICES_TITLE}
            </h2>
            <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {AGENCY_SERVICES.map((s) => {
                const Icon = SERVICE_ICONS[s.id];
                return (
                  <li
                    key={s.id}
                    className="flex gap-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-4"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4af6a]/12 text-[#d4af6a] ring-1 ring-[#d4af6a]/25">
                      <Icon />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-[family-name:var(--font-agency-display)] text-base font-semibold text-[#f4efe6]">
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
          className="border-t border-white/[0.06] px-4 py-12 sm:px-8 sm:py-16"
          aria-labelledby="verticals-heading"
        >
          <div className="mx-auto max-w-5xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4af6a]/80">
              {AGENCY_VERTICALS_HEADING}
            </p>
            <h2
              id="verticals-heading"
              className="mt-3 font-[family-name:var(--font-agency-display)] text-[1.85rem] font-semibold tracking-tight text-[#faf6ee] sm:text-[2.35rem]"
            >
              {AGENCY_VERTICALS_TITLE}
            </h2>
            <ul className="mt-8 grid grid-cols-2 gap-3">
              {AGENCY_VERTICALS.map((v) => {
                const Icon = VERTICAL_ICONS[v.id];
                return (
                  <li
                    key={v.id}
                    className="flex flex-col items-start gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-4 sm:px-4 sm:py-5"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d4af6a]/12 text-[#d4af6a] ring-1 ring-[#d4af6a]/25">
                      <Icon />
                    </span>
                    <div>
                      <h3 className="font-[family-name:var(--font-agency-display)] text-[14px] font-semibold text-[#f4efe6] sm:text-[15px]">
                        {v.title}
                      </h3>
                      <p className="mt-0.5 text-[12px] leading-snug text-[#9e968a]">{v.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section
          id="work"
          className="border-t border-white/[0.06] bg-[#0c0b10] px-4 py-12 sm:px-8 sm:py-16"
          aria-labelledby="clients-heading"
        >
          <div className="mx-auto max-w-5xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4af6a]/80">
              {AGENCY_WORK_HEADING}
            </p>
            <h2
              id="clients-heading"
              className="mt-3 max-w-xl font-[family-name:var(--font-agency-display)] text-[1.85rem] font-semibold tracking-tight text-[#faf6ee] sm:text-[2.35rem]"
            >
              {AGENCY_WORK_TITLE}
            </h2>
            <ul className="mt-8 flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible md:grid-cols-4 [&::-webkit-scrollbar]:hidden">
              {portfolio.map((brand) => (
                <li
                  key={brand.id}
                  className="flex w-[42%] shrink-0 flex-col items-center gap-2.5 rounded-2xl border border-white/[0.07] bg-black/40 px-3 py-4 sm:w-auto sm:py-5"
                >
                  <div className="relative h-11 w-11 overflow-hidden rounded-xl bg-white/[0.04] ring-1 ring-white/10">
                    <Image
                      src={logoPath(brand.id, brand.logoPath)}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-contain p-1.5"
                    />
                  </div>
                  <span className="text-center text-[12px] font-medium text-[#cfc7b8]">{brand.shortName}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          className="border-t border-white/[0.06] px-4 py-12 sm:px-8 sm:py-16"
          aria-labelledby="process-heading"
        >
          <div className="mx-auto max-w-5xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4af6a]/80">
              {AGENCY_STEPS_HEADING}
            </p>
            <h2
              id="process-heading"
              className="mt-3 font-[family-name:var(--font-agency-display)] text-[1.85rem] font-semibold tracking-tight text-[#faf6ee] sm:text-[2.35rem]"
            >
              {AGENCY_STEPS_TITLE}
            </h2>
            <ol className="mt-8 grid gap-3 sm:grid-cols-3 sm:gap-4">
              {AGENCY_STEPS.map((s) => (
                <li key={s.step} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-4">
                  <p className="font-[family-name:var(--font-agency-display)] text-sm font-semibold tracking-[0.18em] text-[#d4af6a]">
                    {s.step}
                  </p>
                  <h3 className="mt-1.5 font-[family-name:var(--font-agency-display)] text-lg font-semibold text-[#f4efe6]">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-[13px] text-[#9e968a]">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          className="border-t border-white/[0.06] px-4 py-12 sm:px-8 sm:py-16"
          aria-labelledby="hospitality-heading"
        >
          <div className="mx-auto max-w-5xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4af6a]/80">
              {AGENCY_HOSPITALITY_HEADING}
            </p>
            <h2
              id="hospitality-heading"
              className="mt-3 max-w-xl font-[family-name:var(--font-agency-display)] text-[1.85rem] font-semibold tracking-tight text-[#faf6ee] sm:text-[2.35rem]"
            >
              {AGENCY_HOSPITALITY_TITLE}
            </h2>
            <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[#9e968a]">{AGENCY_HOSPITALITY_BODY}</p>
            <a
              href={investUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#d4af6a]/50 px-6 text-[14px] font-semibold text-[#d4af6a] transition hover:bg-[#d4af6a]/10 sm:w-auto"
            >
              Discuss a partnership
            </a>
          </div>
        </section>

        <section
          id="contact"
          className="border-t border-white/[0.06] bg-[#0c0b10] px-4 py-14 sm:px-8 sm:py-20"
          aria-labelledby="contact-heading"
        >
          <div className="mx-auto max-w-5xl text-center">
            <h2
              id="contact-heading"
              className="font-[family-name:var(--font-agency-display)] text-[1.85rem] font-semibold tracking-tight text-[#faf6ee] sm:text-[2.35rem]"
            >
              {AGENCY_CONTACT_TITLE}
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-[#9e968a]">
              {AGENCY_CONTACT_BODY}
            </p>
            <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <a
                href={talkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#d4af6a] px-8 text-[15px] font-semibold text-[#140f0a] transition hover:bg-[#e0c07e]"
              >
                WhatsApp Bassik
              </a>
              <a
                href={auditUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-6 text-[14px] font-medium text-[#e8e2d6] transition hover:border-[#d4af6a]/45"
              >
                Free marketing audit
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] px-4 py-8 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-[family-name:var(--font-agency-display)] text-sm font-semibold tracking-wide text-[#cfc7b8]">
            Bassik
          </p>
          <p className="text-[12px] text-[#6f685e]">Marketing packages for brands that show up offline</p>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#07060a]/92 px-3 py-2.5 backdrop-blur-md sm:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          <a
            href="#packages"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-white/15 text-[13px] font-semibold text-[#e8e2d6]"
          >
            Packages
          </a>
          <a
            href={talkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 flex-[1.35] items-center justify-center rounded-full bg-[#d4af6a] text-[13px] font-semibold text-[#140f0a]"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
