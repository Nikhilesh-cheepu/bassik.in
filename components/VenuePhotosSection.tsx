"use client";

import { motion } from "framer-motion";
import GalleryCarousel from "@/components/GalleryCarousel";

interface VenuePhotosSectionProps {
  loading: boolean;
  images: string[];
  accentColor: string;
  onOpenGallery?: () => void;
}

export default function VenuePhotosSection({
  loading,
  images,
  accentColor,
  onOpenGallery,
}: VenuePhotosSectionProps) {
  if (loading) {
    return <div className="aspect-video w-full bg-white/5 animate-pulse" />;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="w-full min-w-0 overflow-x-hidden"
    >
      <h2 className="text-sm font-semibold text-white mb-2 px-1">Photos</h2>
      <GalleryCarousel
        images={images}
        accentColor={accentColor}
        onViewAll={images.length > 0 ? onOpenGallery : undefined}
      />
    </motion.section>
  );
}

