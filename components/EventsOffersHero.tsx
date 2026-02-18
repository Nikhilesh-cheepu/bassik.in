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
const BORDER_RADIUS = 16;
const CARD_MAX_HEIGHT_VH = 58;
const AUTOPLAY_DELAY_MS = 1000;
const AUTOPLAY_RESUME_AFTER_MS = 2000;

function ShimmerCard() {
  return (
    <div
      className="flex-shrink-0 overflow-hidden rounded-[16px] bg-white/10 animate-pulse"
      style={{
        aspectRatio: "9 / 16",
        maxHeight: `${CARD_MAX_HEIGHT_VH}vh`,
        width: "100%",
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

  // Loading: show shimmer only during real fetch (9:16 cards, same size as carousel)
  if (isLoading) {
    return (
      <div className="offers-hero-carousel w-full bg-black/40 backdrop-blur-sm border-b border-white/10 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center pt-2 pb-3">
          <div className="w-full flex justify-center">
            <div className="flex gap-3 justify-center" style={{ width: "min(92vw, 420px)" }}>
              <ShimmerCard />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No offers after fetch completed
  if (!hasOffers) {
    return (
      <div className="offers-hero-carousel w-full bg-black/40 backdrop-blur-sm border-b border-white/10 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center pt-2 pb-3">
          <div
            className="rounded-[16px] flex items-center justify-center bg-black/30 border border-white/10"
            style={{
              aspectRatio: "9 / 16",
              width: "min(92vw, 420px)",
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
    <div className="offers-hero-carousel w-full bg-black/40 backdrop-blur-sm border-b border-white/10 relative overflow-visible">
      <style dangerouslySetInnerHTML={{ __html: `
        .offers-hero-carousel .swiper-slide .offer-card-inner {
          transform: scale(0.92);
          opacity: 0.85;
          transition: transform 0.25s ease-out, opacity 0.25s ease-out, box-shadow 0.25s ease-out;
        }
        .offers-hero-carousel .swiper-slide-active .offer-card-inner {
          transform: scale(1);
          opacity: 1;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06);
        }
      `}} />
      <div className="relative z-10 flex flex-col items-center pt-2 pb-3">
        <div
          className="w-full overflow-visible"
          style={{ touchAction: "pan-x", WebkitOverflowScrolling: "touch" }}
        >
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
            className="!overflow-visible w-full"
            loop
            centeredSlides
            slidesPerView={1.5}
            spaceBetween={12}
            speed={350}
            allowTouchMove
            grabCursor
            touchEventsTarget="container"
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
                    className="offer-card-inner overflow-hidden rounded-[16px] relative flex flex-col items-center justify-center w-full"
                    style={{
                      maxHeight: `${CARD_MAX_HEIGHT_VH}vh`,
                      aspectRatio: "9 / 16",
                      borderRadius: BORDER_RADIUS,
                    }}
                  >
                    <div className="absolute inset-0 bg-black/50 rounded-[16px]" />
                    <div className="relative w-full h-full min-h-0">
                      <Image
                        src={offer.imageUrl}
                        alt={offer.title}
                        fill
                        sizes="(max-width: 768px) 67vw, 400px"
                        className="object-contain"
                        style={{ borderRadius: BORDER_RADIUS }}
                        priority={i === 0}
                        loading={i === 0 ? "eager" : "lazy"}
                        quality={85}
                        onLoad={() => handleImageLoad(offer.id)}
                      />
                      {!imageLoaded[offer.id] && (
                        <div
                          className="absolute inset-0 rounded-[16px] bg-white/10 animate-pulse"
                          style={{ borderRadius: BORDER_RADIUS }}
                        />
                      )}
                    </div>
                    {total > 1 && (
                      <div
                        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-full backdrop-blur-md border border-white/10"
                        style={{
                          backgroundColor: "rgba(0,0,0,0.35)",
                        }}
                      >
                        {Array.from({ length: total }).map((_, idx) => (
                          <span
                            key={idx}
                            className="rounded-full transition-all duration-200"
                            style={{
                              width: idx === activeIndex ? 14 : 6,
                              height: 6,
                              backgroundColor: idx === activeIndex
                                ? "rgba(212, 175, 55, 0.95)"
                                : "rgba(255,255,255,0.35)",
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </div>
  );
}
