"use client";

import { useEffect } from "react";
import ProposalBrandMarquee from "@/components/agency/ProposalBrandMarquee";
import {
  AD_PLATFORM_TILES,
  DigitalPlatformGrid,
  PlatformTileCard,
} from "@/components/agency/ProposalPlatformIcons";
import { whatsAppShareUrl } from "@/lib/team-whatsapp-report";
import type { ClientProposal } from "@/lib/proposals/types";

type Props = {
  proposal: ClientProposal;
};

/** Proposal WhatsApp — Raasta / Bassik outreach line */
const PROPOSAL_WA_PHONE = "9550770707";

const SCOPE_COLORS = ["#A855F7", "#FB923C", "#B8FF3C", "#22D3EE"] as const;

function Check() {
  return (
    <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="7" fill="rgba(184,255,60,0.12)" stroke="#B8FF3C" strokeWidth="1.2" />
      <path
        d="M4.5 8.2 6.8 10.5 11.5 5.5"
        stroke="#B8FF3C"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Star({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`${className} text-[#FACC15]`} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.5 14.2 9l6.8.5-5.2 4.2 1.6 6.5L12 16.8 6.6 20.2l1.6-6.5L3 9.5 9.8 9 12 2.5Z" />
    </svg>
  );
}

function Card({
  children,
  accent = false,
  className = "",
}: {
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[1.35rem] p-4 lg:rounded-[1.5rem] lg:p-6 ${accent ? "proposal-glass-accent" : "proposal-glass"} ${className}`}
    >
      {children}
    </div>
  );
}

function Section({
  id,
  num,
  title,
  children,
}: {
  id?: string;
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <p className="proposal-label">{num}</p>
      <h2 className="proposal-glow-strong mt-1 font-[family-name:var(--font-agency-display)] text-[1.4rem] font-bold leading-tight lg:text-[1.75rem]">
        {title}
      </h2>
      <div className="proposal-underline" />
      <div className="mt-4 space-y-3 lg:mt-5 lg:space-y-4">{children}</div>
    </section>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[14px] font-semibold leading-[1.65] text-white/75 lg:text-[15px] lg:leading-[1.7]">
      {children}
    </p>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 lg:space-y-2.5">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2.5 text-[13px] font-semibold leading-snug text-white/80 lg:text-[14px]"
        >
          <Check />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/80 lg:text-[12px]"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function CommercialSummaryCard({
  proposal,
  talkUrl,
}: {
  proposal: ClientProposal;
  talkUrl: string;
}) {
  return (
    <Card accent className="!p-5">
      <p className="proposal-label">Commercial Summary</p>
      <dl className="mt-3 space-y-2.5">
        {proposal.commercialSummary.map((row) => (
          <div
            key={row.label}
            className="flex items-start justify-between gap-3 border-b border-white/10 pb-2.5 last:border-0 last:pb-0"
          >
            <dt className="text-[12px] font-semibold text-white/55">{row.label}</dt>
            <dd className="text-right text-[12px] font-bold text-white">{row.value}</dd>
          </div>
        ))}
      </dl>
      <a
        href={talkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="proposal-cta-lime mt-5 flex min-h-12 w-full items-center justify-center rounded-full text-[14px] font-bold"
      >
        WhatsApp Bassik
      </a>
    </Card>
  );
}

export default function ClientProposalDoc({ proposal }: Props) {
  const talkUrl = whatsAppShareUrl(
    `Hi Bassik — I've reviewed the ${proposal.clientName} ${proposal.clientLocation} proposal. Let's discuss next steps.`,
    PROPOSAL_WA_PHONE
  );
  const isInstitute = proposal.variant === "institute";
  let sectionNum = 0;
  const nextNum = () => String(++sectionNum).padStart(2, "0");

  useEffect(() => {
    document.body.classList.add("proposal-active");
    return () => document.body.classList.remove("proposal-active");
  }, []);

  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="proposal-doc min-h-screen text-white">
      <div className="mx-auto w-full max-w-[430px] pb-24 lg:max-w-7xl lg:pb-20">
        {/* Hero */}
        <header className="relative overflow-hidden px-4 pb-8 pt-9 sm:px-6 lg:px-10 lg:pb-14 lg:pt-16">
          <div className="absolute right-5 top-8 opacity-90 lg:right-12 lg:top-14" aria-hidden>
            <Star className="h-4 w-4 lg:h-7 lg:w-7" />
          </div>

          <div className="lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.9fr)] lg:items-end lg:gap-12">
            <div>
              <p className="proposal-label">Proposal</p>
              <h1 className="proposal-glow-strong mt-2 font-[family-name:var(--font-agency-display)] text-[1.85rem] font-bold leading-[1.08] sm:text-[2.1rem] lg:text-[clamp(2.5rem,4.2vw,3.4rem)]">
                {proposal.documentTitle}
              </h1>
              <div className="proposal-underline" />
              <p className="mt-3 text-[16px] font-bold text-white lg:mt-4 lg:text-[22px]">
                {proposal.clientName} {proposal.clientLocation}
              </p>
              <p className="mt-2 max-w-2xl text-[14px] font-semibold leading-relaxed text-white/60 lg:text-[16px] lg:leading-[1.7]">
                {proposal.tagline}
              </p>
            </div>

            <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:mt-0 lg:grid-cols-1 lg:gap-3">
              <Card>
                <p className="proposal-label">Submitted to</p>
                <p className="mt-1.5 text-[15px] font-bold text-white lg:text-[17px]">
                  {proposal.submittedTo.name}
                </p>
                <p className="text-[13px] font-semibold text-white/55">{proposal.submittedTo.title}</p>
                <p className="text-[13px] font-bold text-[#B8FF3C]">{proposal.submittedTo.organization}</p>
              </Card>
              <Card>
                <p className="proposal-label">Submitted by</p>
                <p className="mt-1.5 text-[14px] font-bold text-white lg:text-[15px]">
                  {proposal.submittedBy.organization}
                </p>
                {proposal.submittedBy.signatories.map((s) => (
                  <p key={s.name} className="mt-1 text-[13px] font-semibold text-white/70">
                    <span className="font-bold text-white">{s.name}</span> · {s.title}
                  </p>
                ))}
              </Card>
            </div>
          </div>
        </header>

        {/* Body + desktop sidebar */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-12 lg:px-10">
          <main className="space-y-12 px-4 sm:px-6 lg:space-y-16 lg:px-0">
            <Section id="intro" num={nextNum()} title="Introduction">
              <Card>
                {proposal.introduction.map((para, i) => (
                  <p
                    key={para.slice(0, 48)}
                    className={`text-[14px] font-semibold leading-[1.65] text-white/75 lg:text-[15px] lg:leading-[1.7] ${i > 0 ? "mt-3 lg:mt-4" : ""}`}
                  >
                    {para}
                  </p>
                ))}
              </Card>
            </Section>

            {proposal.aboutClient && !isInstitute ? (
              <Section num={nextNum()} title={proposal.aboutClient.title}>
                <Card>
                  {proposal.aboutClient.paragraphs.map((para, i) => (
                    <p
                      key={para.slice(0, 40)}
                      className={`text-[14px] font-semibold leading-[1.65] text-white/75 lg:text-[15px] lg:leading-[1.7] ${i > 0 ? "mt-3 lg:mt-4" : ""}`}
                    >
                      {para}
                    </p>
                  ))}
                  <p className="proposal-label mt-4 lg:mt-5">At a glance</p>
                  <div className="mt-2">
                    <Chips items={proposal.aboutClient.highlights} />
                  </div>
                </Card>
              </Section>
            ) : null}

            {!isInstitute ? (
              <Section num={nextNum()} title="About Bassik Hospitality Services Pvt. Ltd.">
                <Card>
                  {proposal.aboutBassik.paragraphs.map((para, i) => (
                    <p
                      key={para.slice(0, 40)}
                      className={`text-[14px] font-semibold leading-[1.65] text-white/75 lg:text-[15px] lg:leading-[1.7] ${i > 0 ? "mt-3 lg:mt-4" : ""}`}
                    >
                      {para}
                    </p>
                  ))}
                  <p className="proposal-label mt-4 lg:mt-5">Our expertise includes</p>
                  <div className="mt-2">
                    <Chips items={proposal.aboutBassik.expertise} />
                  </div>
                  <p className="mt-4 text-[14px] font-semibold leading-relaxed text-white/70 lg:text-[15px]">
                    {proposal.aboutBassik.closing}
                  </p>
                </Card>
              </Section>
            ) : null}

            <Section num={nextNum()} title={isInstitute ? "Who Leads This" : "Leadership"}>
              <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
                {proposal.leadership.map((person, idx) => {
                  const listIntroIdx = person.bio.findIndex((line) => line.trim().endsWith(":"));
                  const beforeList = listIntroIdx >= 0 ? person.bio.slice(0, listIntroIdx + 1) : person.bio;
                  const afterList = listIntroIdx >= 0 ? person.bio.slice(listIntroIdx + 1) : [];
                  return (
                    <Card key={person.name} accent={idx === 0}>
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[14px] font-bold text-[#0b0c10] lg:h-14 lg:w-14 lg:text-[15px]"
                          style={{ background: idx === 0 ? "#B8FF3C" : "#A855F7" }}
                        >
                          {person.name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)}
                        </span>
                        <div>
                          <p className="font-[family-name:var(--font-agency-display)] text-[16px] font-bold uppercase tracking-wide lg:text-[18px]">
                            {person.name}
                          </p>
                          <p className="text-[12px] font-bold text-white/55 lg:text-[13px]">{person.title}</p>
                        </div>
                      </div>
                      {beforeList.map((line) => (
                        <p
                          key={line.slice(0, 40)}
                          className="mt-3 text-[13px] font-semibold leading-relaxed text-white/72 lg:text-[14px]"
                        >
                          {line}
                        </p>
                      ))}
                      <div className="mt-2">
                        <Chips items={person.highlights} />
                      </div>
                      {afterList.map((line) => (
                        <p
                          key={line.slice(0, 40)}
                          className="mt-3 text-[13px] font-semibold leading-relaxed text-white/72 lg:text-[14px]"
                        >
                          {line}
                        </p>
                      ))}
                    </Card>
                  );
                })}
              </div>
              <Body>{proposal.leadershipClosing}</Body>
            </Section>

            {!isInstitute ? (
              <Section id="portfolio" num={nextNum()} title="Our Portfolio">
                <Body>{proposal.portfolioIntro}</Body>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-3">
                  {proposal.portfolio.map((brand) => (
                    <Card key={brand.name} className="!p-3.5 lg:!p-5">
                      <p className="font-[family-name:var(--font-agency-display)] text-[14px] font-bold uppercase tracking-wide text-white lg:text-[15px]">
                        {brand.name}
                      </p>
                      <p className="mt-1.5 text-[13px] font-semibold leading-relaxed text-white/65 lg:text-[14px]">
                        {brand.description}
                      </p>
                    </Card>
                  ))}
                </div>
                <ProposalBrandMarquee />
              </Section>
            ) : null}

            {/* Institute: service work first — engagement then campaigns then collaboration */}
            {isInstitute ? (
              <Section
                id="engagement"
                num={nextNum()}
                title={proposal.engagementTitle ?? `Proposed Engagement with ${proposal.clientName}`}
              >
                <Body>{proposal.engagement.intro}</Body>
                <p className="text-[13px] font-bold text-white/55 lg:text-[14px]">
                  The service covers:
                </p>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:gap-4">
                  {proposal.engagement.categories.map((cat, i) => (
                    <Card key={cat.title}>
                      <div
                        className="mb-2 h-1 w-10 rounded-full"
                        style={{
                          background: SCOPE_COLORS[i % SCOPE_COLORS.length],
                          boxShadow: `0 0 10px ${SCOPE_COLORS[i % SCOPE_COLORS.length]}`,
                        }}
                      />
                      <p className="font-[family-name:var(--font-agency-display)] text-[15px] font-bold text-white lg:text-[16px]">
                        {cat.title}
                      </p>
                      <div className="mt-3">
                        <Bullets items={cat.items} />
                      </div>
                    </Card>
                  ))}
                </div>
                <Card accent>
                  <p className="font-[family-name:var(--font-agency-display)] text-[15px] font-bold lg:text-[17px]">
                    Platforms we work on
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-white/60 lg:text-[14px]">
                    Management, creatives and campaign optimisation across:
                  </p>
                  <div className="mt-4">
                    <DigitalPlatformGrid platforms={proposal.engagement.digitalPlatforms} />
                  </div>
                </Card>
                <p className="text-[13px] font-semibold italic leading-relaxed text-white/50 lg:text-[14px]">
                  {proposal.engagement.note}
                </p>
              </Section>
            ) : null}

            {proposal.campaigns ? (
              <Section
                num={nextNum()}
                title={isInstitute ? "IHM Hyderabad Campaign Plan" : "Campaign Framework"}
              >
                <Body>{proposal.campaigns.intro}</Body>
                <div className="grid gap-3 lg:gap-4">
                  {proposal.campaigns.items.map((campaign, i) => (
                    <Card key={campaign.title} accent={i % 2 === 0}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full px-2.5 py-1 text-[11px] font-bold text-[#0b0c10]"
                          style={{ background: SCOPE_COLORS[i % SCOPE_COLORS.length] }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <p className="font-[family-name:var(--font-agency-display)] text-[16px] font-bold text-white lg:text-[18px]">
                          {campaign.title}
                        </p>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
                        <div>
                          <p className="proposal-label">
                            {isInstitute ? "What we will do" : "What we can run"}
                          </p>
                          <p className="mt-1 text-[13px] font-semibold leading-relaxed text-white/75 lg:text-[14px]">
                            {campaign.whatWeRun}
                          </p>
                        </div>
                        <div>
                          <p className="proposal-label">
                            {isInstitute ? "What we will create" : "Content we can create"}
                          </p>
                          <p className="mt-1 text-[13px] font-semibold leading-relaxed text-white/75 lg:text-[14px]">
                            {campaign.content}
                          </p>
                        </div>
                        <div>
                          <p className="proposal-label">Channels</p>
                          <div className="mt-1.5">
                            <Chips items={campaign.where} />
                          </div>
                        </div>
                        <div>
                          <p className="proposal-label">
                            {isInstitute ? "Outcome for IHM" : "Expected result"}
                          </p>
                          <p className="mt-1 text-[13px] font-semibold leading-relaxed text-[#B8FF3C]/90 lg:text-[14px]">
                            {campaign.result}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                <p className="text-[13px] font-semibold italic leading-relaxed text-white/50 lg:text-[14px]">
                  {proposal.campaigns.closing}
                </p>
              </Section>
            ) : null}

            {isInstitute && proposal.collaboration ? (
              <Section num={nextNum()} title="Industry Connect & Student Opportunity">
                <Body>{proposal.collaboration.intro}</Body>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
                  {proposal.collaboration.pillars.map((pillar, i) => (
                    <Card key={pillar.title}>
                      <div
                        className="mb-2 h-1 w-10 rounded-full"
                        style={{
                          background: SCOPE_COLORS[i % SCOPE_COLORS.length],
                          boxShadow: `0 0 10px ${SCOPE_COLORS[i % SCOPE_COLORS.length]}`,
                        }}
                      />
                      <p className="font-[family-name:var(--font-agency-display)] text-[15px] font-bold text-white lg:text-[16px]">
                        {pillar.title}
                      </p>
                      <div className="mt-3">
                        <Bullets items={pillar.items} />
                      </div>
                    </Card>
                  ))}
                </div>
                <p className="text-[13px] font-semibold italic leading-relaxed text-white/55 lg:text-[14px]">
                  {proposal.collaboration.closing}
                </p>
              </Section>
            ) : null}

            {!isInstitute ? (
              <Section
                id="engagement"
                num={nextNum()}
                title={proposal.engagementTitle ?? `Proposed Engagement with ${proposal.clientName}`}
              >
                <Body>{proposal.engagement.intro}</Body>
                <p className="text-[13px] font-bold text-white/55 lg:text-[14px]">
                  The engagement will focus broadly on:
                </p>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:gap-4">
                  {proposal.engagement.categories.map((cat, i) => (
                    <Card key={cat.title}>
                      <div
                        className="mb-2 h-1 w-10 rounded-full"
                        style={{
                          background: SCOPE_COLORS[i % SCOPE_COLORS.length],
                          boxShadow: `0 0 10px ${SCOPE_COLORS[i % SCOPE_COLORS.length]}`,
                        }}
                      />
                      <p className="font-[family-name:var(--font-agency-display)] text-[15px] font-bold text-white lg:text-[16px]">
                        {cat.title}
                      </p>
                      <div className="mt-3">
                        <Bullets items={cat.items} />
                      </div>
                    </Card>
                  ))}
                </div>
                <Card accent>
                  <p className="font-[family-name:var(--font-agency-display)] text-[15px] font-bold lg:text-[17px]">
                    Digital Platforms
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-white/60 lg:text-[14px]">
                    Management and optimisation of:
                  </p>
                  <div className="mt-4">
                    <DigitalPlatformGrid platforms={proposal.engagement.digitalPlatforms} />
                  </div>
                </Card>
                <p className="text-[13px] font-semibold italic leading-relaxed text-white/50 lg:text-[14px]">
                  {proposal.engagement.note}
                </p>
              </Section>
            ) : null}

            {proposal.investmentFraming ? (
              <Section num={nextNum()} title="Investment Framing">
                <Card accent>
                  <p className="font-[family-name:var(--font-agency-display)] text-[1.15rem] font-bold leading-snug text-[#B8FF3C] lg:text-[1.4rem]">
                    {proposal.investmentFraming.headline}
                  </p>
                  {proposal.investmentFraming.paragraphs.map((para) => (
                    <p
                      key={para.slice(0, 40)}
                      className="mt-3 text-[14px] font-semibold leading-[1.65] text-white/75 lg:text-[15px] lg:leading-[1.7]"
                    >
                      {para}
                    </p>
                  ))}
                  <div className="mt-4">
                    <Bullets items={proposal.investmentFraming.points} />
                  </div>
                </Card>
              </Section>
            ) : null}

            <Section id="pricing" num={nextNum()} title={isInstitute ? "Digital Growth Partnership Fee" : "Digital Marketing Management Fee"}>
              <div
                className={`grid gap-3 lg:gap-4 ${
                  proposal.digitalMarketingFee.complimentaryShootItems?.length
                    ? "lg:grid-cols-[1.2fr_0.8fr]"
                    : ""
                }`}
              >
                <Card accent>
                  <p className="text-[13px] font-semibold text-white/65 lg:text-[14px]">
                    {isInstitute
                      ? "The monthly digital growth partnership fee will be:"
                      : "The professional digital marketing management fee will be:"}
                  </p>
                  <p className="proposal-lime mt-1 font-[family-name:var(--font-agency-display)] text-[1.85rem] font-bold lg:text-[2.25rem]">
                    {proposal.digitalMarketingFee.amount}
                  </p>
                  <p className="mt-2 text-[13px] font-bold text-white/65 lg:text-[14px]">
                    Payment Terms: {proposal.digitalMarketingFee.paymentTerms}
                  </p>
                  <p className="mt-3 text-[13px] font-semibold text-white/60 lg:text-[14px]">
                    The fee will cover:
                  </p>
                  <div className="mt-3">
                    <Bullets items={proposal.digitalMarketingFee.includes} />
                  </div>
                </Card>
                {proposal.digitalMarketingFee.complimentaryShootItems?.length ? (
                  <Card>
                    <p className="font-[family-name:var(--font-agency-display)] text-[15px] font-bold text-[#B8FF3C] lg:text-[16px]">
                      Monthly Complimentary Shoot
                    </p>
                    <p className="mt-2 text-[13px] font-semibold text-white/70 lg:text-[14px]">
                      {proposal.digitalMarketingFee.complimentaryShootIntro}
                    </p>
                    <div className="mt-3">
                      <Bullets items={proposal.digitalMarketingFee.complimentaryShootItems} />
                    </div>
                    {proposal.digitalMarketingFee.complimentaryShootNote ? (
                      <p className="mt-3 text-[13px] font-semibold text-white/60 lg:text-[14px]">
                        {proposal.digitalMarketingFee.complimentaryShootNote}
                      </p>
                    ) : null}
                  </Card>
                ) : null}
              </div>
            </Section>

            {proposal.advertisingBudget ? (
              <Section num={nextNum()} title={isInstitute ? "Advertising Budget — Open Discussion" : "Advertising Budget"}>
                <Card>
                  <p className="text-[13px] font-semibold text-white/65 lg:text-[14px]">
                    {isInstitute
                      ? "Paid media is not locked in this proposal. Our position:"
                      : "The proposed monthly advertising budget is:"}
                  </p>
                  <p className="proposal-glow mt-1 font-[family-name:var(--font-agency-display)] text-[1.55rem] font-bold lg:text-[2rem]">
                    {proposal.advertisingBudget.total}
                  </p>
                  <p className="proposal-label mt-4">
                    {isInstitute ? "How we keep it light" : "Proposed allocation"}
                  </p>
                  {isInstitute ? (
                    <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:gap-3">
                      {proposal.advertisingBudget.allocation.map((line) => (
                        <div
                          key={line.label}
                          className="rounded-xl border border-white/10 bg-black/30 px-3.5 py-3 lg:p-4"
                        >
                          <p className="text-[12px] font-semibold text-white/55">{line.label}</p>
                          <p className="mt-1 text-[13px] font-bold leading-snug text-[#B8FF3C] lg:text-[14px]">
                            {line.amount}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="mt-2 grid gap-2 lg:grid-cols-3 lg:gap-3">
                        <PlatformTileCard key={AD_PLATFORM_TILES[0].label} tile={AD_PLATFORM_TILES[0]} />
                        <PlatformTileCard key={AD_PLATFORM_TILES[1].label} tile={AD_PLATFORM_TILES[1]} />
                        <PlatformTileCard key={AD_PLATFORM_TILES[2].label} tile={AD_PLATFORM_TILES[2]} />
                      </div>
                      <div className="mt-3 flex items-center justify-between rounded-xl border border-[#B8FF3C]/30 bg-[#B8FF3C]/10 px-3.5 py-3 lg:px-5 lg:py-4">
                        <span className="text-[14px] font-bold text-white lg:text-[15px]">TOTAL</span>
                        <span className="proposal-lime font-[family-name:var(--font-agency-display)] text-[16px] font-bold lg:text-[18px]">
                          {proposal.advertisingBudget.allocation
                            .reduce((sum, line) => {
                              const n = Number(line.amount.replace(/[^\d]/g, ""));
                              return sum + (Number.isFinite(n) ? n : 0);
                            }, 0)
                            .toLocaleString("en-IN", {
                              style: "currency",
                              currency: "INR",
                              maximumFractionDigits: 0,
                            })}
                        </span>
                      </div>
                    </>
                  )}
                  <p className="mt-3 text-[13px] font-semibold leading-relaxed text-white/55 lg:text-[14px]">
                    {proposal.advertisingBudget.note}
                  </p>
                </Card>
              </Section>
            ) : null}

            {proposal.influencerBudget ? (
              <Section num={nextNum()} title="Influencer Marketing Budget">
                <Card accent>
                  <div className="lg:flex lg:items-start lg:justify-between lg:gap-8">
                    <div className="lg:flex-1">
                      <p className="text-[13px] font-semibold text-white/65 lg:text-[14px]">
                        For the initial brand-revival phase, an influencer marketing budget of:
                      </p>
                      <p className="proposal-lime mt-1 font-[family-name:var(--font-agency-display)] text-[1.85rem] font-bold lg:text-[2.25rem]">
                        {proposal.influencerBudget.amount}
                      </p>
                      <p className="mt-3 text-[13px] font-semibold text-white/65 lg:text-[14px]">
                        {proposal.influencerBudget.periodLabel}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {proposal.influencerBudget.months.map((m) => (
                          <span
                            key={m}
                            className="rounded-full bg-[#B8FF3C] px-3 py-1.5 text-[12px] font-bold text-[#0b0c10]"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 lg:mt-0 lg:max-w-sm lg:flex-1">
                      <p className="text-[13px] font-semibold text-white/65 lg:text-[14px]">
                        This is a dedicated budget for influencer and creator marketing and is separate from:
                      </p>
                      <div className="mt-2">
                        <Bullets items={proposal.influencerBudget.separateFrom} />
                      </div>
                      <p className="mt-3 text-[13px] font-semibold leading-relaxed text-white/70 lg:text-[14px]">
                        {proposal.influencerBudget.note}
                      </p>
                    </div>
                  </div>
                </Card>
              </Section>
            ) : null}

            {proposal.performanceRetainer ? (
              <Section num={nextNum()} title="Performance-Linked Retainer">
                <Card>
                  <Body>{proposal.performanceRetainer.intro}</Body>
                  <div className="mt-4 grid gap-2 lg:grid-cols-3 lg:gap-3">
                    {proposal.performanceRetainer.tiers.map((tier) => (
                      <div
                        key={tier.range}
                        className="rounded-xl border border-white/10 bg-black/30 px-3.5 py-3 lg:p-4"
                      >
                        <p className="text-[13px] font-bold text-white lg:text-[14px]">{tier.range}</p>
                        <p className="mt-0.5 text-[13px] font-bold text-[#C084FC] lg:text-[14px]">{tier.rate}</p>
                      </div>
                    ))}
                  </div>
                  <p className="proposal-label mt-4">Examples</p>
                  <p className="mt-1 text-[12px] font-semibold text-white/50 lg:text-[13px]">
                    If monthly revenue reaches:
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 lg:gap-3">
                    {proposal.performanceRetainer.examples.map((ex) => (
                      <div
                        key={ex.revenue}
                        className="rounded-xl border border-[#A855F7]/30 bg-[#A855F7]/10 p-3 text-center lg:p-5"
                      >
                        <p className="text-[12px] font-bold text-white lg:text-[14px]">{ex.revenue}</p>
                        <p className="mt-1 text-[11px] font-semibold text-white/50">Performance retainer</p>
                        <p className="mt-0.5 text-[14px] font-bold text-[#B8FF3C] lg:text-[18px]">{ex.retainer}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[12px] font-semibold leading-relaxed text-white/50 lg:text-[13px]">
                    {proposal.performanceRetainer.note}
                  </p>
                </Card>
              </Section>
            ) : null}

            <Section num={nextNum()} title="Taxation & TDS">
              <Card>
                <Body>{proposal.taxation.intro}</Body>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-black/25 p-3.5 lg:p-5">
                    <p className="text-[13px] font-bold text-[#B8FF3C] lg:text-[14px]">GST</p>
                    <p className="mt-1.5 text-[13px] font-semibold leading-relaxed text-white/70 lg:text-[14px]">
                      {proposal.taxation.gst}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/25 p-3.5 lg:p-5">
                    <p className="text-[13px] font-bold text-[#22D3EE] lg:text-[14px]">TDS</p>
                    <p className="mt-1.5 text-[13px] font-semibold leading-relaxed text-white/70 lg:text-[14px]">
                      {proposal.taxation.tds}
                    </p>
                  </div>
                </div>
              </Card>
            </Section>

            <Section num={nextNum()} title="Key Areas of Consulting Support">
              <Body>
                As part of the broader engagement, Bassik will provide strategic direction and support across:
              </Body>
              <Chips items={proposal.consultingSupport} />
              <p className="text-[13px] font-semibold italic text-white/50 lg:text-[14px]">
                {proposal.consultingNote}
              </p>
            </Section>

            <Section num={nextNum()} title="Engagement Philosophy">
              <Card accent>
                <Body>{proposal.philosophy.intro}</Body>
                <p className="mt-4 text-[13px] font-semibold text-white/55 lg:text-[14px]">
                  Our focus will be on the complete commercial ecosystem:
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 lg:gap-2">
                  {proposal.philosophy.flow.split(" → ").map((step, i, arr) => (
                    <span key={step} className="flex items-center gap-1.5">
                      <span className="rounded-full border border-[#B8FF3C]/30 bg-[#B8FF3C]/10 px-2.5 py-1 text-[11px] font-bold text-[#B8FF3C] lg:px-3.5 lg:py-1.5 lg:text-[13px]">
                        {step}
                      </span>
                      {i < arr.length - 1 ? <span className="text-white/35">→</span> : null}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-[14px] font-semibold leading-relaxed text-white/70 lg:text-[15px]">
                  {proposal.philosophy.closing}
                </p>
              </Card>
            </Section>

            <Section num={nextNum()} title="Next Phase">
              <Card>
                <Body>{proposal.nextPhase.intro}</Body>
                <div className="mt-3 lg:mt-4">
                  <div className="lg:hidden">
                    <Bullets items={proposal.nextPhase.deliverables} />
                  </div>
                  <ul className="hidden lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-2.5">
                    {proposal.nextPhase.deliverables.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-[14px] font-semibold text-white/80"
                      >
                        <Check />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-4 text-[13px] font-semibold leading-relaxed text-white/60 lg:text-[14px]">
                  {proposal.nextPhase.closing}
                </p>
              </Card>
            </Section>

            {isInstitute ? (
              <>
                <Section num={nextNum()} title="About Bassik">
                  <Card>
                    {proposal.aboutBassik.paragraphs.map((para, i) => (
                      <p
                        key={para.slice(0, 40)}
                        className={`text-[14px] font-semibold leading-[1.65] text-white/75 lg:text-[15px] lg:leading-[1.7] ${i > 0 ? "mt-3 lg:mt-4" : ""}`}
                      >
                        {para}
                      </p>
                    ))}
                    <p className="proposal-label mt-4 lg:mt-5">Capabilities</p>
                    <div className="mt-2">
                      <Chips items={proposal.aboutBassik.expertise} />
                    </div>
                    <p className="mt-4 text-[14px] font-semibold leading-relaxed text-white/70 lg:text-[15px]">
                      {proposal.aboutBassik.closing}
                    </p>
                  </Card>
                </Section>

                <Section id="portfolio" num={nextNum()} title="Hospitality Network">
                  <Body>{proposal.portfolioIntro}</Body>
                  <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-3">
                    {proposal.portfolio.map((brand) => (
                      <Card key={brand.name} className="!p-3.5 lg:!p-5">
                        <p className="font-[family-name:var(--font-agency-display)] text-[14px] font-bold uppercase tracking-wide text-white lg:text-[15px]">
                          {brand.name}
                        </p>
                        <p className="mt-1.5 text-[13px] font-semibold leading-relaxed text-white/65 lg:text-[14px]">
                          {brand.description}
                        </p>
                      </Card>
                    ))}
                  </div>
                  <ProposalBrandMarquee />
                </Section>
              </>
            ) : null}

            {/* Mobile commercial summary */}
            <Section num={nextNum()} title="Commercial Summary">
              <div className="lg:hidden">
                <Card accent>
                  <dl className="space-y-2.5">
                    {proposal.commercialSummary.map((row) => (
                      <div
                        key={row.label}
                        className="flex items-start justify-between gap-3 border-b border-white/10 pb-2.5 last:border-0 last:pb-0"
                      >
                        <dt className="text-[12px] font-semibold text-white/55">{row.label}</dt>
                        <dd className="text-right text-[12px] font-bold text-white">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              </div>
              <div className="hidden lg:block">
                <Card accent>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 xl:grid-cols-3">
                    {proposal.commercialSummary.map((row) => (
                      <div key={row.label} className="border-b border-white/10 pb-3">
                        <p className="text-[11px] font-semibold text-white/50">{row.label}</p>
                        <p className="mt-1 text-[14px] font-bold text-white">{row.value}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </Section>

            <Section num={nextNum()} title="Closing">
              <Card>
                {proposal.closing.paragraphs.map((para) => (
                  <p
                    key={para.slice(0, 40)}
                    className="mb-3 last:mb-0 text-[14px] font-semibold leading-relaxed text-white/75 lg:text-[15px]"
                  >
                    {para}
                  </p>
                ))}
                <p className="proposal-label mt-4">Our objective is straightforward</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {proposal.closing.objectives.map((obj) => (
                    <div
                      key={obj}
                      className="rounded-xl border border-[#B8FF3C]/25 bg-[#B8FF3C]/10 px-4 py-3 text-center lg:py-4"
                    >
                      <p className="font-[family-name:var(--font-agency-display)] text-[12px] font-bold uppercase tracking-wide text-white sm:text-[13px] lg:text-[14px]">
                        {obj}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <p className="proposal-label">For {proposal.submittedBy.organization}</p>
                <div className="mt-2 grid gap-6 sm:grid-cols-2">
                  {proposal.submittedBy.signatories.map((s) => (
                    <div key={s.name}>
                      <div className="h-10 border-b border-[#B8FF3C]/35 lg:h-14" aria-hidden />
                      <p className="mt-2 font-[family-name:var(--font-agency-display)] text-[15px] font-bold uppercase tracking-wide lg:text-[16px]">
                        {s.name}
                      </p>
                      <p className="text-[13px] font-semibold text-white/55">{s.title}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-[13px] font-semibold text-white/45">
                  {proposal.submittedBy.organization}
                  <br />
                  {proposal.submittedBy.location}
                </p>
              </Card>
            </Section>
          </main>

          {/* Desktop sticky sidebar */}
          <aside className="hidden lg:sticky lg:top-8 lg:block lg:self-start">
            <CommercialSummaryCard proposal={proposal} talkUrl={talkUrl} />
            <button
              type="button"
              onClick={scrollToPricing}
              className="proposal-glass mt-3 flex min-h-11 w-full items-center justify-center rounded-full border border-white/15 text-[13px] font-bold text-white/80 transition hover:border-white/25 hover:text-white"
            >
              Jump to commercials ↓
            </button>
          </aside>
        </div>
      </div>

      {/* Mobile sticky CTA only */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b0c10]/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-[430px] items-center gap-2.5">
          <button
            type="button"
            onClick={scrollToPricing}
            className="proposal-glass min-h-12 shrink-0 rounded-full border border-white/15 px-4 text-[13px] font-bold text-white"
          >
            ₹ Commercials
          </button>
          <a
            href={talkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="proposal-cta-lime flex min-h-12 flex-1 items-center justify-center rounded-full text-[14px] font-bold"
          >
            WhatsApp Bassik
          </a>
        </div>
      </div>
    </div>
  );
}
