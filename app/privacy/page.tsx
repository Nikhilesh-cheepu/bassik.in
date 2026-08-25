import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { SiteFooter } from "@/components/agency/SiteFooter";
import { bassikAgencyWhatsAppUrl, BASSIK_HQ_PHONE } from "@/lib/bassik-agency";
import { getFullPhoneNumber } from "@/lib/outlet-contacts";

export const metadata: Metadata = {
  title: "Privacy Policy | Bassik",
  description:
    "How Bassik collects, uses, and protects personal data on bassik.in — bookings, chat, marketing enquiries, and WhatsApp. India · DPDP-aligned notice.",
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "25 August 2026";
const PRIVACY_WA = bassikAgencyWhatsAppUrl(
  "Hi Bassik — I have a privacy / personal data request about bassik.in."
);
const CONTACT_PHONE = getFullPhoneNumber(BASSIK_HQ_PHONE);
const CONTACT_DISPLAY = `+${CONTACT_PHONE}`;

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F7F5F8] text-[#12131A]">
      <header className="border-b border-[#E6E1E8] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative h-9 w-9 overflow-hidden rounded-xl bg-[#12131A] ring-1 ring-black/10">
              <Image src="/logos/bassik.png" alt="" fill sizes="36px" className="object-contain p-1.5" />
            </div>
            <span className="font-[family-name:var(--font-agency-display)] text-[15px] font-semibold">
              Bassik
            </span>
          </Link>
          <Link
            href="/"
            className="text-[12px] font-semibold text-[#6B6570] hover:text-[#12131A] hover:underline underline-offset-2"
          >
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8B8494]">Legal</p>
        <h1 className="mt-2 font-[family-name:var(--font-agency-display)] text-[clamp(1.85rem,5vw,2.5rem)] font-semibold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-2 text-[13px] text-[#6B6570]">Last updated: {LAST_UPDATED}</p>
        <p className="mt-4 text-[14px] leading-relaxed text-[#4A4550]">
          This notice explains how <strong>Bassik</strong> (“we”, “us”) collects and uses personal data when you
          use <strong>bassik.in</strong> and related services — including venue chat and bookings, marketing /
          growth enquiries (including <Link href="/grow" className="underline underline-offset-2">/grow</Link>
          ), and WhatsApp conversations with our team. It is written in plain language and is meant to stand on
          its own, in line with India’s Digital Personal Data Protection Act, 2023 (DPDP Act) and good practice.
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-[#8B8494]">
          This page is informational and is not legal advice. If your situation needs formal counsel, please
          speak to a lawyer.
        </p>

        <div className="prose-privacy mt-10 space-y-9 text-[14px] leading-relaxed text-[#4A4550]">
          <Section title="1. Who we are (Data Fiduciary)">
            <p>
              Bassik operates digital marketing / growth services and hospitality-related digital products
              (venue pages, chat, reservations) under the Bassik brand.
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>
                Website:{" "}
                <a href="https://bassik.in" className="underline underline-offset-2">
                  https://bassik.in
                </a>
              </li>
              <li>
                WhatsApp / phone:{" "}
                <a href={`tel:+${CONTACT_PHONE}`} className="underline underline-offset-2">
                  {CONTACT_DISPLAY}
                </a>
              </li>
              <li>
                Privacy requests:{" "}
                <a href={PRIVACY_WA} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  WhatsApp Bassik
                </a>
              </li>
            </ul>
          </Section>

          <Section title="2. Personal data we collect (itemised)">
            <p>Depending on how you use the site, we may process:</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>
                <strong>Identity & contact:</strong> name, mobile / WhatsApp number, optional business or venue
                name
              </li>
              <li>
                <strong>Booking & visit details:</strong> party size, preferred date/time, outlet or event
                interest, special requests you type in chat
              </li>
              <li>
                <strong>Chat / lead records:</strong> messages you send in venue chat or marketing flows, and
                status of your enquiry or booking
              </li>
              <li>
                <strong>Payment-related data:</strong> when you pay online, payment confirmation identifiers
                via our payment partner (we do not store full card numbers on Bassik servers)
              </li>
              <li>
                <strong>Technical data:</strong> device/browser type, approximate IP, pages visited, cookies or
                similar session tokens needed to keep you logged into chat or guest booking flows
              </li>
              <li>
                <strong>Marketing enquiries:</strong> details you share on growth pages (e.g. /grow) or when you
                message us on WhatsApp about services
              </li>
            </ul>
          </Section>

          <Section title="3. Why we use it (purposes & services)">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Respond to enquiries and run WhatsApp / call conversations</li>
              <li>Provide venue chat, reservations, and related guest support</li>
              <li>Process payments and confirm bookings where applicable</li>
              <li>Operate and improve bassik.in (reliability, security, analytics)</li>
              <li>Offer Bassik growth / marketing services when you ask for them</li>
              <li>Comply with law and resolve disputes or abuse</li>
            </ul>
            <p className="mt-3">
              We process this data with your consent when you submit forms, start chat, book, or message us —
              and where needed to perform a service you requested (for example completing a reservation).
            </p>
          </Section>

          <Section title="4. How we collect it">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Directly from you (forms, chat, booking flows, WhatsApp)</li>
              <li>Automatically when you browse (cookies/session, basic logs, hosting analytics)</li>
              <li>From payment gateways confirming a successful payment for a booking</li>
            </ul>
          </Section>

          <Section title="5. Sharing & processors">
            <p>We do not sell your personal data. We may share it with:</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>
                <strong>Hosting & infrastructure</strong> (e.g. cloud / Vercel-style hosting) to run the
                website
              </li>
              <li>
                <strong>Payment providers</strong> (e.g. Razorpay) to take and verify payments
              </li>
              <li>
                <strong>Messaging platforms</strong> (WhatsApp / Meta) when you choose to open a chat with us
              </li>
              <li>
                <strong>Venue / brand operators</strong> connected to a booking or chat you started for that
                outlet
              </li>
              <li>
                <strong>Analytics</strong> used to understand traffic (for example Vercel Analytics or similar)
              </li>
              <li>
                <strong>Authorities</strong> when required by law
              </li>
            </ul>
            <p className="mt-3">
              If you arrive from Meta / Google ads, those platforms may also process data under their own
              policies when you interact with ads.
            </p>
          </Section>

          <Section title="6. Cookies & similar tech">
            <p>
              We use cookies or similar storage for essential sessions (chat continuity, guest login, team /
              admin access where applicable) and limited analytics. You can clear cookies in your browser;
              some features (like staying in a chat session) may stop working if you do.
            </p>
          </Section>

          <Section title="7. Retention">
            <p>
              We keep personal data only as long as needed for the purposes above — for example while a
              booking or lead is active, plus a reasonable period for support, accounting, or legal
              requirements — then delete or anonymise it where practicable.
            </p>
          </Section>

          <Section title="8. Security">
            <p>
              We use reasonable technical and organisational measures (HTTPS, access controls on admin tools,
              limited staff access). No method of transmission or storage is 100% secure; please avoid sending
              unnecessary sensitive data in chat.
            </p>
          </Section>

          <Section title="9. Your rights (Data Principal)">
            <p>Subject to applicable law, you may request to:</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Erase data when it is no longer needed or consent is withdrawn (subject to legal limits)</li>
              <li>Withdraw consent for processing that relies on consent</li>
              <li>Nominate another person to exercise rights on your behalf where the law allows</li>
              <li>Raise a grievance with us, and complain to the Data Protection Board of India</li>
            </ul>
            <p className="mt-3">
              To exercise rights or withdraw consent with similar ease to how you contacted us, message us on{" "}
              <a href={PRIVACY_WA} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                WhatsApp
              </a>{" "}
              or call{" "}
              <a href={`tel:+${CONTACT_PHONE}`} className="underline underline-offset-2">
                {CONTACT_DISPLAY}
              </a>
              . We aim to respond within a reasonable time (and within timelines required by law, including
              grievance handling).
            </p>
          </Section>

          <Section title="10. Children">
            <p>
              Our services are aimed at adults making business or hospitality enquiries and bookings. We do
              not knowingly collect personal data from children for marketing. If you believe a child has
              shared data with us, contact us and we will take appropriate steps.
            </p>
          </Section>

          <Section title="11. Changes">
            <p>
              We may update this notice from time to time. The “Last updated” date at the top will change when
              we do. Continued use of bassik.in after an update means you should review the latest version.
            </p>
          </Section>

          <Section title="12. Contact for privacy">
            <p>
              For any privacy question, consent withdrawal, or data rights request:
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>
                WhatsApp:{" "}
                <a href={PRIVACY_WA} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  Message Bassik
                </a>
              </li>
              <li>
                Phone:{" "}
                <a href={`tel:+${CONTACT_PHONE}`} className="underline underline-offset-2">
                  {CONTACT_DISPLAY}
                </a>
              </li>
              <li>
                Web:{" "}
                <a href="https://bassik.in" className="underline underline-offset-2">
                  https://bassik.in
                </a>
              </li>
            </ul>
          </Section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-[family-name:var(--font-agency-display)] text-lg font-semibold text-[#12131A]">
        {title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
