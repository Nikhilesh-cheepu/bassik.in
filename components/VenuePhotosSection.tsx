"use client";

import { motion } from "framer-motion";
import Image from "next/image";
interface VenuePhotosSectionProps {
  loading: boolean;
  images: string[];
  onOpenGallery?: () => void;
}

export default function VenuePhotosSection({
  loading,
  images,
  onOpenGallery,
}: VenuePhotosSectionProps) {
  const hasImages = images.length > 0;
  const tileImages = hasImages ? images.slice(0, 6) : [];
  const remainingCount = hasImages ? Math.max(0, images.length - 6) : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="w-full min-w-0 overflow-x-hidden"
    >
      <h2 className="text-sm font-semibold text-white mb-2 px-1">Photos</h2>
      {!loading && !hasImages ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 row-span-2 h-44 rounded-2xl bg-white/8 animate-pulse" />
          <div className="h-[86px] rounded-2xl bg-white/8 animate-pulse" />
          <div className="h-[86px] rounded-2xl bg-white/8 animate-pulse" />
          <div className="h-20 rounded-2xl bg-white/8 animate-pulse" />
          <div className="h-20 rounded-2xl bg-white/8 animate-pulse" />
          <div className="h-20 rounded-2xl bg-white/8 animate-pulse" />
        </div>
      ) : loading ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 row-span-2 h-44 rounded-2xl bg-white/8 animate-pulse" />
          <div className="h-[86px] rounded-2xl bg-white/8 animate-pulse" />
          <div className="h-[86px] rounded-2xl bg-white/8 animate-pulse" />
          <div className="h-20 rounded-2xl bg-white/8 animate-pulse" />
          <div className="h-20 rounded-2xl bg-white/8 animate-pulse" />
          <div className="h-20 rounded-2xl bg-white/8 animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {tileImages.map((src, idx) => {
            const className =
              idx === 0
                ? "col-span-2 row-span-2 h-44 rounded-2xl"
                : idx === 1 || idx === 2
                  ? "h-[86px] rounded-2xl"
                  : "h-20 rounded-2xl";
            const isLastVisible = idx === tileImages.length - 1 && remainingCount > 0;
            return (
              <button
                key={`${src}-${idx}`}
                type="button"
                onClick={onOpenGallery}
                className={`relative overflow-hidden bg-white/5 ${className}`}
              >
                <Image src={src} alt="" fill className="object-cover" unoptimized />
                {isLastVisible && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white">
                    +{remainingCount}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}

