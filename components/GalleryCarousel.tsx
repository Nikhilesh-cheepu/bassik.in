"use client";

import { useState } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

interface GalleryCarouselProps {
  images: string[];
  accentColor?: string;
  onViewAll?: () => void;
}

export default function GalleryCarousel({ images, accentColor = "#f97316", onViewAll }: GalleryCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = images.length;

  if (images.length === 0) {
    return (
      <div className="aspect-video w-full bg-white/5 flex items-center justify-center rounded-lg">
        <p className="text-sm text-white/50">No photos</p>
      </div>
    );
  }

  return (
    <div className="relative w-full min-w-0 overflow-x-hidden">
      <Swiper
        onSwiper={(sw) => sw && setActiveIndex(sw.realIndex)}
        onSlideChange={(sw) => setActiveIndex(sw.realIndex)}
        className="!overflow-hidden w-full"
        loop
        centeredSlides
        slidesPerView={1.15}
        spaceBetween={12}
        speed={400}
        grabCursor
        allowTouchMove
      >
        {images.map((src, i) => (
          <SwiperSlide key={`${src}-${i}`}>
            <div
              className="relative w-full overflow-hidden bg-black/20"
              style={{ aspectRatio: "16 / 9" }}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="(max-width: 768px) 90vw, 500px"
                className="object-cover"
                unoptimized
                loading="lazy"
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      {/* Counter: bottom center, glass, subtle */}
      {total > 1 && (
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 px-2.5 py-1 rounded-full text-[11px] font-medium tabular-nums backdrop-blur-md border border-white/10"
          style={{
            backgroundColor: "rgba(0,0,0,0.35)",
            color: "rgba(212, 175, 55, 0.9)",
          }}
        >
          {activeIndex + 1} / {total}
        </div>
      )}
      {onViewAll && (
        <button
          type="button"
          onClick={onViewAll}
          className="absolute bottom-2 right-2 z-10 px-2.5 py-1 rounded-lg text-xs font-medium bg-black/50 backdrop-blur-sm border border-white/10 text-white/90 hover:bg-black/60 transition-colors touch-manipulation"
          style={{ color: accentColor }}
        >
          View all →
        </button>
      )}
    </div>
  );
}
