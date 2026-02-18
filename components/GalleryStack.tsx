"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { motion, useAnimationControls } from "framer-motion";

const STACK_Y_BACK = 24;
const STACK_Y_MID = 12;
const STACK_SCALE_BACK = 0.88;
const STACK_SCALE_MID = 0.94;
const SWIPE_THRESHOLD = 60;
const SPRING = { type: "spring" as const, stiffness: 320, damping: 32 };

interface GalleryStackProps {
  images: string[];
  accentColor?: string;
  onViewAll?: () => void;
}

export default function GalleryStack({ images, accentColor = "#f97316", onViewAll }: GalleryStackProps) {
  const [index, setIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const frontControls = useAnimationControls();
  const midControls = useAnimationControls();
  const backControls = useAnimationControls();

  const n = Math.max(1, images.length);
  const safeIndex = ((index % n) + n) % n;

  useEffect(() => {
    frontControls.set({ y: 0, scale: 1 });
    midControls.set({ y: STACK_Y_MID, scale: STACK_SCALE_MID });
    backControls.set({ y: STACK_Y_BACK, scale: STACK_SCALE_BACK });
  }, [frontControls, midControls, backControls]);

  const goNext = useCallback(() => {
    if (transitioning || n <= 0) return;
    setTransitioning(true);
    frontControls.start({ y: "-100%", scale: STACK_SCALE_MID, transition: SPRING });
    midControls.start({ y: 0, scale: 1, transition: SPRING });
    backControls.start({ y: STACK_Y_MID, scale: STACK_SCALE_MID, transition: SPRING }).then(() => {
      setIndex((i) => i + 1);
      setTransitioning(false);
      frontControls.set({ y: 0, scale: 1 });
      midControls.set({ y: STACK_Y_MID, scale: STACK_SCALE_MID });
      backControls.set({ y: STACK_Y_BACK, scale: STACK_SCALE_BACK });
    });
  }, [n, transitioning, frontControls, midControls, backControls]);

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
      if (transitioning || n <= 1) return;
      if (info.offset.y < -SWIPE_THRESHOLD || info.velocity.y < -200) goNext();
    },
    [n, transitioning, goNext]
  );

  if (images.length === 0) {
    return (
      <div className="rounded-[20px] overflow-hidden bg-white/5 border border-white/10 aspect-video flex items-center justify-center">
        <p className="text-sm text-white/50">No photos</p>
      </div>
    );
  }

  const backImg = images[(safeIndex + 2) % n];
  const midImg = images[(safeIndex + 1) % n];
  const frontImg = images[safeIndex];

  return (
    <div className="relative w-full overflow-hidden rounded-[20px]">
      {/* Blur behind stack */}
      <div className="absolute inset-0 -z-10 rounded-[20px] bg-black/30 backdrop-blur-md" />
      <div className="relative" style={{ aspectRatio: "16 / 9" }}>
        {/* Back card */}
        <motion.div
          className="absolute left-0 right-0 rounded-[20px] overflow-hidden shadow-xl border border-white/10 bg-black/20"
          style={{
            top: 0,
            width: "100%",
            aspectRatio: "16 / 9",
            zIndex: 0,
            boxShadow: "0 10px 40px -12px rgba(0,0,0,0.4)",
          }}
          initial={{ y: STACK_Y_BACK, scale: STACK_SCALE_BACK }}
          animate={backControls}
          transition={SPRING}
        >
          <Image
            src={backImg}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 420px"
            className="object-cover"
            style={{ borderRadius: "inherit" }}
            unoptimized
            loading="lazy"
          />
        </motion.div>

        {/* Mid card */}
        <motion.div
          className="absolute left-0 right-0 rounded-[20px] overflow-hidden shadow-xl border border-white/10 bg-black/20"
          style={{
            top: 0,
            width: "100%",
            aspectRatio: "16 / 9",
            zIndex: 1,
            boxShadow: "0 10px 40px -12px rgba(0,0,0,0.4)",
          }}
          initial={{ y: STACK_Y_MID, scale: STACK_SCALE_MID }}
          animate={midControls}
          transition={SPRING}
        >
          <Image
            src={midImg}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 420px"
            className="object-cover"
            style={{ borderRadius: "inherit" }}
            unoptimized
            loading="lazy"
          />
        </motion.div>

        {/* Front card (draggable) */}
        <motion.div
          className="absolute left-0 right-0 rounded-[20px] overflow-hidden shadow-xl border border-white/10 bg-black/20 touch-manipulation cursor-grab active:cursor-grabbing"
          style={{
            top: 0,
            width: "100%",
            aspectRatio: "16 / 9",
            zIndex: 2,
            boxShadow: "0 20px 50px -15px rgba(0,0,0,0.5)",
          }}
          initial={{ y: 0, scale: 1 }}
          animate={frontControls}
          transition={SPRING}
          drag="y"
          dragConstraints={{ top: -400, bottom: 0 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
        >
          <Image
            src={frontImg}
            alt="Gallery"
            fill
            sizes="(max-width: 640px) 100vw, 420px"
            className="object-cover pointer-events-none select-none"
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
            unoptimized
            priority
            draggable={false}
          />
        </motion.div>
      </div>

      {onViewAll && images.length > 0 && (
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
