"use client";

import { useState, useRef } from "react";
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
}

const PLACEHOLDER = "No active offers right now";
const BORDER_RADIUS = 16;
const CARD_MAX_HEIGHT_VH = 58;
const CARD_WIDTH = "min(92vw, 420px)";

export default function EventsOffersHero({ offers, brand }: EventsOffersHeroProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const hasOffers = offers.length > 0;
  const total = offers.length;

  return (
    <div className="offers-hero-carousel w-full bg-black/40 backdrop-blur-sm border-b border-white/10 relative overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        .offers-hero-carousel .swiper-slide .offer-card-inner {
          transform: scale(0.93);
          transition: transform 0.25s ease-out;
        }
        .offers-hero-carousel .swiper-slide-active .offer-card-inner {
          transform: scale(1);
        }
      `}} />
      {/* Small top padding; dropdown can overlap slightly, stays above with z-index */}
      <div className="relative z-10 flex flex-col items-center pt-2 pb-3">
        {hasOffers ? (
          <div className="w-full overflow-hidden">
            <Swiper
              onSwiper={(s) => {
                swiperRef.current = s;
                if (s) setActiveIndex(s.realIndex);
              }}
              onSlideChange={(sw) => setActiveIndex(sw.realIndex)}
              className="!overflow-visible w-full"
              loop
              centeredSlides
              slidesPerView={1.35}
              spaceBetween={14}
              speed={400}
              allowTouchMove
              autoplay={{ delay: 4000, disableOnInteraction: false }}
              modules={[Autoplay]}
              style={{ overflow: "hidden" }}
            >
              {offers.map((offer, i) => (
                <SwiperSlide key={offer.id}>
                  <div className="flex justify-center">
                    <div
                      className="offer-card-inner overflow-hidden rounded-[16px] relative flex flex-col items-center justify-center"
                      style={{
                        width: CARD_WIDTH,
                        maxHeight: `${CARD_MAX_HEIGHT_VH}vh`,
                        aspectRatio: "9 / 16",
                        borderRadius: BORDER_RADIUS,
                        boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
                      }}
                    >
                      {/* Dark background for letterboxing when image doesn't fill */}
                      <div className="absolute inset-0 bg-black/50 rounded-[16px]" />
                      <div className="relative w-full h-full min-h-0">
                        <Image
                          src={offer.imageUrl}
                          alt={offer.title}
                          fill
                          sizes="(max-width: 768px) 92vw, 420px"
                          className="object-contain"
                          style={{ borderRadius: BORDER_RADIUS }}
                          priority={i === 0}
                          loading={i === 0 ? "eager" : "lazy"}
                          quality={85}
                        />
                      </div>
                      {total > 1 && (
                        <div
                          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-2.5 py-1 rounded-full text-[11px] font-medium tabular-nums backdrop-blur-md border border-white/10"
                          style={{
                            backgroundColor: "rgba(0,0,0,0.4)",
                            color: "rgba(212, 175, 55, 0.95)",
                          }}
                        >
                          {activeIndex + 1} / {total}
                        </div>
                      )}
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        ) : (
          <div
            className="rounded-[16px] flex items-center justify-center bg-black/30 border border-white/10"
            style={{
              aspectRatio: "9 / 16",
              width: CARD_WIDTH,
              maxHeight: `${CARD_MAX_HEIGHT_VH}vh`,
              borderRadius: BORDER_RADIUS,
            }}
          >
            <p className="text-white/70 text-sm px-4 text-center">{PLACEHOLDER}</p>
          </div>
        )}
      </div>
    </div>
  );
}
