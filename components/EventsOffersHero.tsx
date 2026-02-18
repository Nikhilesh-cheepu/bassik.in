"use client";

import { useRef } from "react";
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
const CARD_WIDTH_VW = 90;
const BORDER_RADIUS = 20;

export default function EventsOffersHero({ offers, brand }: EventsOffersHeroProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const hasOffers = offers.length > 0;

  return (
    <div
      className="w-full bg-black/40 backdrop-blur-sm border-b border-white/10 relative overflow-hidden"
      style={{ maxHeight: `${MAX_HEIGHT_VH}vh` }}
    >
      <div className="relative z-10 flex flex-col items-center py-3 sm:py-4">
        {hasOffers ? (
          <div className="w-full flex justify-center" style={{ width: `${CARD_WIDTH_VW}vw`, maxWidth: "100%" }}>
            <Swiper
              onSwiper={(s) => { swiperRef.current = s; }}
              className="!overflow-visible"
              style={{ width: "100%", maxWidth: "min(92vw, 420px)" }}
              loop
              centeredSlides
              slidesPerView={1.05}
              spaceBetween={14}
              speed={600}
              allowTouchMove
              autoplay={{ delay: 4000, disableOnInteraction: false }}
              modules={[Autoplay]}
            >
              {offers.map((offer, i) => (
                <SwiperSlide key={offer.id}>
                  <div
                    className="rounded-[20px] overflow-hidden bg-black/20 flex items-center justify-center w-full"
                    style={{
                      aspectRatio: "9 / 16",
                      maxHeight: `calc(${MAX_HEIGHT_VH}vh - 2rem)`,
                      borderRadius: BORDER_RADIUS,
                    }}
                  >
                    <div className="relative w-full h-full min-h-0">
                      <Image
                        src={offer.imageUrl}
                        alt={offer.title}
                        fill
                        sizes="(max-width: 768px) 90vw, 400px"
                        className="object-contain"
                        style={{ borderRadius: BORDER_RADIUS }}
                        priority={i === 0}
                        loading={i === 0 ? "eager" : "lazy"}
                        quality={85}
                      />
                    </div>
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
              width: `${Math.min(CARD_WIDTH_VW, 85)}vw`,
              maxWidth: 360,
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
