"use client";

import { useCallback, useRef } from "react";
import Image from "next/image";
import type { Brand } from "@/lib/brands";
import ConciergeEventsRow, { type ConciergeOffer } from "@/components/ConciergeEventsRow";
import VenueChatWidget, { type VenueChatWidgetHandle } from "@/components/VenueChatWidget";

type OutletConciergeSectionProps = {
  brand: Brand;
  logoPath: string;
  offers: ConciergeOffer[];
  contactPhone: string;
  whatsappMessage?: string;
  mapUrl?: string | null;
  tagline?: string;
  onOpenMenu?: () => void;
};

export default function OutletConciergeSection({
  brand,
  logoPath,
  offers,
  contactPhone,
  whatsappMessage,
  mapUrl,
  tagline,
  onOpenMenu,
}: OutletConciergeSectionProps) {
  const chatRef = useRef<VenueChatWidgetHandle>(null);
  const accent = brand.accentColor;

  const handleOfferSelect = useCallback((offer: ConciergeOffer) => {
    const label =
      [offer.title?.trim(), offer.eventDate].filter(Boolean).join(" · ") || "Event";
    chatRef.current?.selectLandingEvent({
      id: offer.id,
      imageUrl: offer.imageUrl,
      label,
    });
    chatRef.current?.expandChat();
  }, []);

  return (
    <section
      className="relative mx-3 mt-2 overflow-hidden rounded-[28px] border border-white/[0.08] shadow-2xl"
      style={{
        background: `linear-gradient(165deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 40%, rgba(0,0,0,0.4) 100%), linear-gradient(135deg, ${accent}18 0%, transparent 55%)`,
        boxShadow: `0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.12)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255,255,255,0.15), transparent)",
        }}
      />

      <div className="relative px-4 pt-5 pb-3">
        <div className="flex items-start gap-3">
          <div
            className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 shadow-inner"
            style={{ background: `linear-gradient(145deg, ${accent}55, ${accent}22)` }}
          >
            <Image src={logoPath} alt="" fill sizes="44px" className="object-contain p-1.5" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
              Dear Guest
            </p>
            <h1 className="mt-0.5 text-[17px] font-semibold leading-snug text-white">
              Welcome to {brand.shortName}
            </h1>
            <p className="mt-1 text-[12px] leading-relaxed text-white/55">
              I&apos;m <span style={{ color: accent }}>Anil</span>, your host — pick an event or chat
              below and I&apos;ll lock in your table.
            </p>
            {tagline ? (
              <p className="mt-1 text-[11px] italic text-white/35">{tagline}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/[0.06] px-4 py-3">
        <ConciergeEventsRow
          offers={offers}
          accentColor={accent}
          onSelect={handleOfferSelect}
        />
      </div>

      <div className="relative border-t border-white/[0.06] px-3 pb-3 pt-2">
        <VenueChatWidget
          ref={chatRef}
          brandId={brand.id}
          venueShortName={brand.shortName}
          accentColor={accent}
          contactPhone={contactPhone}
          whatsappMessage={whatsappMessage}
          mapUrl={mapUrl}
          onOpenMenu={onOpenMenu}
          layout="embedded"
        />
      </div>
    </section>
  );
}
