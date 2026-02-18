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
const MAX_HEIGHT_VH = 75;
const BORDER_RADIUS = 20;

export default function EventsOffersHero({ offers, brand }: EventsOffersHeroProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const hasOffers = offers.length > 0;
  const total = offers.length;

  return (
    <div
      className="w-full bg-black/40 backdrop-blur-sm border-b border-white/10 relative overflow-hidden"
      style={{ maxHeight: `${MAX_HEIGHT_VH}vh` }}
    >
      {/* Extra top spacing so venue dropdown does not overlap the poster */}
      <div className="relative z-10 flex flex-col items-center pt-14 sm:pt-16 pb-2">
        {hasOffers ? (
          <div className="w-full flex justify-center px-2">
            <Swiper
              onSwiper={(s) => {
                swiperRef.current = s;
                if (s) setActiveIndex(s.realIndex);
              }}
              onSlideChange={(sw) => setActiveIndex(sw.realIndex)}
              className="!overflow-visible w-full max-w-[min(92vw,420px)]"
              loop
              centeredSlides
              slidesPerView={1.05}
              spaceBetween={14}
              speed={400}
              allowTouchMove
              autoplay={{ delay: 4000, disableOnInteraction: false }}
              modules={[Autoplay]}
              style={{ overflow: "hidden" }}
            >
              {offers.map((offer, i) => (
                <SwiperSlide key={offer.id}>
                  <div
                    className="w-full overflow-hidden rounded-[20px] bg-black/20 relative"
                    style={{
                      aspectRatio: "9 / 16",
                      borderRadius: BORDER_RADIUS,
                    }}
                  >
                    <div className="relative w-full h-full">
                      <Image
                        src={offer.imageUrl}
                        alt={offer.title}
                        fill
                        sizes="(max-width: 768px) 90vw, 400px"
                        className="object-cover"
                        style={{ borderRadius: BORDER_RADIUS }}
                        priority={i === 0}
                        loading={i === 0 ? "eager" : "lazy"}
                        quality={85}
                      />
                    </div>
                    {/* Counter: bottom center, glass, gold */}
                    {total > 1 && (
                      <div
                        className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 px-2.5 py-1 rounded-full text-[11px] font-medium tabular-nums backdrop-blur-md border border-white/10"
                        style={{
                          backgroundColor: "rgba(0,0,0,0.35)",
                          color: "rgba(212, 175, 55, 0.95)",
                        }}
                      >
                        {activeIndex + 1} / {total}
                      </div>
                    )}
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        ) : (
          <div
            className="rounded-[20px] flex items-center justify-center bg-black/30 border border-white/10"
            style={{
              aspectRatio: "9 / 16",
              width: "min(90vw, 360px)",
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
