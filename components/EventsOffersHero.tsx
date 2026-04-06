"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import type { Brand } from "@/lib/brands";
import HeroAmbientVideo from "@/components/HeroAmbientVideo";
import "swiper/css";

export type HeroOffer = {
  id: string;
  imageUrl: string;
  title: string | null;
  eventDate: string | null;
  entryLabel: string | null;
  capacityText: string | null;
};

interface EventsOffersHeroProps {
  offers: HeroOffer[];
  brand: Brand;
  /** When true, show shimmer skeleton instead of "No offers" or carousel */
  isLoading?: boolean;
  /** Looping MP4/WebM behind the carousel; tab blur pauses audio (see HeroAmbientVideo) */
  ambientVideoSrc?: string | null;
  onActiveOfferChange?: (offerId: string) => void;
  onOfferClick?: (offerId: string) => void;
}

const PLACEHOLDER = "No active offers right now";
const BORDER_RADIUS = 20;
const CARD_MAX_HEIGHT_VH = 54;
const GAP_PX = 12;
const PADDING_INLINE_PX = 16;

function ShimmerCard() {
  return (
    <div
      className="flex-shrink-0 overflow-hidden bg-white/10 animate-pulse"
      style={{
        aspectRatio: "9 / 16",
        maxHeight: `${CARD_MAX_HEIGHT_VH}vh`,
        width: "78vw",
        borderRadius: BORDER_RADIUS,
      }}
    />
  );
}

export default function EventsOffersHero({
  offers,
  brand: _brand,
  isLoading = false,
  ambientVideoSrc,
  onActiveOfferChange,
  onOfferClick,
}: EventsOffersHeroProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState<Record<string, boolean>>({});

  const hasOffers = offers.length > 0;
  const total = offers.length;

  const handleImageLoad = useCallback((offerId: string) => {
    setImageLoaded((prev) => ({ ...prev, [offerId]: true }));
  }, []);

  if (isLoading) {
    return (
      <div className="offers-hero-carousel w-full max-w-full overflow-x-hidden bg-black/40 backdrop-blur-sm border-b border-white/10 relative overflow-hidden flex-shrink-0">
        <div className="relative z-10 flex flex-col items-center pt-2 pb-2" style={{ paddingInline: PADDING_INLINE_PX }}>
          <div className="w-full flex justify-center" style={{ maxHeight: `${CARD_MAX_HEIGHT_VH}vh` }}>
            <ShimmerCard />
          </div>
        </div>
      </div>
    );
  }

  if (!hasOffers) {
    return (
      <div className="offers-hero-carousel w-full max-w-full overflow-x-hidden bg-black/40 backdrop-blur-sm border-b border-white/10 relative overflow-hidden flex-shrink-0">
        <div className="relative z-10 flex flex-col items-center pt-2 pb-2" style={{ paddingInline: PADDING_INLINE_PX }}>
          <div
            className="flex items-center justify-center bg-black/30 border border-white/10 rounded-[20px]"
            style={{
              aspectRatio: "9 / 16",
              width: "78vw",
              maxHeight: `${CARD_MAX_HEIGHT_VH}vh`,
              borderRadius: BORDER_RADIUS,
            }}
          >
            <p className="text-white/70 text-sm px-4 text-center">{PLACEHOLDER}</p>
          </div>
        </div>
      </div>
    );
  }

  const videoSrc = ambientVideoSrc?.trim() || "";

  return (
    <div className="offers-hero-carousel w-full max-w-full overflow-x-hidden bg-black/40 backdrop-blur-sm border-b border-white/10 relative flex-shrink-0">
      <style dangerouslySetInnerHTML={{ __html: `
        .offers-hero-carousel .swiper { overflow-x: clip !important; overflow-y: visible; }
        .offers-hero-carousel .swiper-wrapper { align-items: center; }
        .offers-hero-carousel .swiper-slide .offer-card-inner {
          transform: scale(0.94);
          opacity: 0.9;
          transition: transform 0.28s ease-out, opacity 0.28s ease-out, box-shadow 0.28s ease-out;
        }
        .offers-hero-carousel .swiper-slide-active .offer-card-inner {
          transform: scale(1);
          opacity: 1;
          box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06);
        }
      `}} />
      {videoSrc ? (
        <div
          className="pointer-events-none absolute left-1/2 top-2 z-0 -translate-x-1/2 overflow-hidden rounded-[20px]"
          style={{
            width: "78vw",
            maxWidth: 400,
            aspectRatio: "9 / 16",
            maxHeight: `${CARD_MAX_HEIGHT_VH}vh`,
          }}
        >
          <HeroAmbientVideo src={videoSrc} className="opacity-60" />
          <div className="pointer-events-none absolute inset-0 bg-black/35" aria-hidden />
        </div>
      ) : null}
      <div className="relative z-10 flex flex-col items-center pt-2 pb-2" style={{ paddingInline: PADDING_INLINE_PX }}>
        <div className="w-full" style={{ touchAction: "pan-x", WebkitOverflowScrolling: "touch" }}>
          <Swiper
            onSwiper={(s) => {
              swiperRef.current = s;
              if (s) setActiveIndex(s.realIndex);
            }}
            onSlideChange={(sw) => {
              setActiveIndex(sw.realIndex);
              const activeOffer = offers[sw.realIndex];
              if (activeOffer) onActiveOfferChange?.(activeOffer.id);
            }}
            className="offers-swiper w-full"
            loop
            centeredSlides
            slidesPerView={1.75}
            spaceBetween={GAP_PX}
            speed={380}
            allowTouchMove
            grabCursor
            touchEventsTarget="container"
            resistanceRatio={0.7}
          >
            {offers.map((offer, i) => (
              <SwiperSlide key={offer.id}>
                <div className="flex justify-center w-full h-full">
                  <button
                    type="button"
                    onClick={() => onOfferClick?.(offer.id)}
                    className="offer-card-inner overflow-hidden relative flex flex-col items-center justify-center w-full rounded-[20px]"
                    style={{
                      maxHeight: `${CARD_MAX_HEIGHT_VH}vh`,
                      aspectRatio: "9 / 16",
                      borderRadius: BORDER_RADIUS,
                    }}
                  >
                    <div className="absolute inset-0 bg-black/50 rounded-[20px]" />
                    <div className="relative w-full h-full min-h-0">
                      <Image
                        src={offer.imageUrl}
                        alt="Offer"
                        fill
                        sizes="(max-width: 768px) 78vw, 400px"
                        className="object-contain"
                        style={{ borderRadius: BORDER_RADIUS }}
                        priority={i <= 1}
                        loading={i <= 1 ? "eager" : "lazy"}
                        quality={85}
                        onLoad={() => handleImageLoad(offer.id)}
                      />
                      {!imageLoaded[offer.id] && (
                        <div
                          className="absolute inset-0 bg-white/10 animate-pulse rounded-[20px]"
                          style={{ borderRadius: BORDER_RADIUS }}
                        />
                      )}
                    </div>
                  </button>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
        {total > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {Array.from({ length: total }).map((_, idx) => (
              <span
                key={idx}
                className="rounded-full transition-all duration-200"
                style={{
                  width: idx === activeIndex ? 18 : 6,
                  height: 6,
                  backgroundColor: idx === activeIndex
                    ? "rgba(255,255,255,0.9)"
                    : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </div>
        )}
        <p className="mt-2 text-center text-[10px] sm:text-[11px] text-white/45 leading-snug tracking-wide max-w-[18rem] mx-auto px-2">
          Tap a poster to book or reserve your spot.
        </p>
      </div>
    </div>
  );
}
