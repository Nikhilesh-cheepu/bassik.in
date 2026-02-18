"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import { Autoplay } from "swiper/modules";
import type { Brand } from "@/lib/brands";
import "swiper/css";

export type HeroOffer = {
  id: string;
  imageUrl: string;
  title: string;
  startDate?: string;
  endDate?: string;
};

interface EventsOffersHeroProps {
  offers: HeroOffer[];
  brand: Brand;
  /** When true, show shimmer skeleton instead of "No offers" or carousel */
  isLoading?: boolean;
}

const PLACEHOLDER = "No active offers right now";
const BORDER_RADIUS = 20;
const CARD_MAX_HEIGHT_VH = 54;
const AUTOPLAY_DELAY_MS = 1000;
const AUTOPLAY_RESUME_AFTER_MS = 2500;
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

export default function EventsOffersHero({ offers, brand, isLoading = false }: EventsOffersHeroProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState<Record<string, boolean>>({});
  const autoplayResumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasOffers = offers.length > 0;
  const total = offers.length;

  const handleImageLoad = useCallback((offerId: string) => {
    setImageLoaded((prev) => ({ ...prev, [offerId]: true }));
  }, []);

  const stopAutoplayAndResumeLater = useCallback(() => {
    const swiper = swiperRef.current;
    if (!swiper?.autoplay) return;
    swiper.autoplay.stop();
    if (autoplayResumeRef.current) clearTimeout(autoplayResumeRef.current);
    autoplayResumeRef.current = setTimeout(() => {
      swiper.autoplay.start();
      autoplayResumeRef.current = null;
    }, AUTOPLAY_RESUME_AFTER_MS);
  }, []);

  if (isLoading) {
    return (
      <div className="offers-hero-carousel w-full bg-black/40 backdrop-blur-sm border-b border-white/10 relative overflow-hidden flex-shrink-0">
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
      <div className="offers-hero-carousel w-full bg-black/40 backdrop-blur-sm border-b border-white/10 relative overflow-hidden flex-shrink-0">
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

  return (
    <div className="offers-hero-carousel w-full bg-black/40 backdrop-blur-sm border-b border-white/10 relative flex-shrink-0">
      <style dangerouslySetInnerHTML={{ __html: `
        .offers-hero-carousel .swiper { overflow: visible !important; }
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
      <div className="relative z-10 flex flex-col items-center pt-2 pb-1" style={{ paddingInline: PADDING_INLINE_PX }}>
        <div className="w-full" style={{ touchAction: "pan-x", WebkitOverflowScrolling: "touch" }}>
          <Swiper
            onSwiper={(s) => {
              swiperRef.current = s;
              if (s) setActiveIndex(s.realIndex);
            }}
            onSlideChange={(sw) => setActiveIndex(sw.realIndex)}
            onTouchEnd={stopAutoplayAndResumeLater}
            onSlideChangeTransitionEnd={() => {
              if (autoplayResumeRef.current) return;
              swiperRef.current?.autoplay?.start();
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
            autoplay={{
              delay: AUTOPLAY_DELAY_MS,
              disableOnInteraction: true,
            }}
            modules={[Autoplay]}
          >
            {offers.map((offer, i) => (
              <SwiperSlide key={offer.id}>
                <div className="flex justify-center w-full h-full">
                  <div
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
                        alt={offer.title}
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
                  </div>
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
      </div>
    </div>
  );
}
