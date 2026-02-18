"use client";

import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

interface GalleryCarouselProps {
  images: string[];
  accentColor?: string;
  onViewAll?: () => void;
}

export default function GalleryCarousel({ images, accentColor = "#f97316", onViewAll }: GalleryCarouselProps) {
  if (images.length === 0) {
    return (
      <div className="rounded-2xl overflow-hidden bg-white/5 border border-white/10 aspect-video flex items-center justify-center">
        <p className="text-sm text-white/50">No photos</p>
      </div>
    );
  }

  return (
    <div className="relative w-full -mx-1">
      <Swiper
        className="!overflow-visible"
        loop
        centeredSlides
        slidesPerView={1.15}
        spaceBetween={16}
        speed={500}
        grabCursor
        allowTouchMove
      >
        {images.map((src, i) => (
          <SwiperSlide key={`${src}-${i}`}>
            <div
              className="relative rounded-2xl overflow-hidden bg-black/20 shadow-lg w-full"
              style={{
                aspectRatio: "16 / 9",
                boxShadow: "0 8px 32px -8px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)",
              }}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="(max-width: 768px) 90vw, 500px"
                className="object-cover"
                style={{ borderRadius: 16 }}
                unoptimized
                loading="lazy"
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
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
