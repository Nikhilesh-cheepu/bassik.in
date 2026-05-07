"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export type FloatingGalleryItem = {
  url: string;
  alt?: string | null;
};

/** Deterministic jitter (%) — keeps orbit layout stable across SSR/hydration. */
const JIT_L: number[] = [
  -1.8, 1.4, -0.9, 2.1, -1.2, 0.7, 1.9, -0.6, 0.4, -1.5, 1.1, -0.3, 0.9,
];
const JIT_T: number[] = [
  0.9, -1.4, 1.8, -0.5, 1.3, -1.9, 0.2, -1.1, 0.6, 1.7, -0.8, 0.35, -1.35,
];
const SIZE_TIERS = ["h-10 w-10 sm:h-12 sm:w-12", "h-12 w-12 sm:h-14 sm:w-14", "h-[2.625rem] w-[2.625rem] sm:h-12 sm:w-12"];

const SPOTLIGHT_MS = 1300;

export default function GalleryFloatingPreviewClient({
  images,
}: {
  images: FloatingGalleryItem[];
}) {
  const reducedMotion = usePrefersReducedMotion();
  const capped = useMemo(() => images.slice(0, 14), [images]);
  const [spotlight, setSpotlight] = useState(0);

  useEffect(() => {
    if (capped.length <= 1) return;
    const id = window.setInterval(() => {
      setSpotlight((i) => (i + 1) % capped.length);
    }, SPOTLIGHT_MS);
    return () => window.clearInterval(id);
  }, [capped.length]);

  const orbit = useMemo(() => {
    if (capped.length === 0) return [];
    return capped.map((img, idx) => ({ img, idx })).filter(({ idx }) => idx !== spotlight);
  }, [capped, spotlight]);

  if (capped.length === 0) return null;

  const n = orbit.length || 1;
  const spotlightItem = capped[spotlight] ?? capped[0];

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[min(100%,34rem)]"
      suppressHydrationWarning
    >
      {orbit.map(({ img, idx }, k) => {
        const angle = (k / n) * Math.PI * 2 - Math.PI / 2;
        const radiusPct = 38;
        let leftPct = 50 + Math.cos(angle) * radiusPct + (JIT_L[k % JIT_L.length] ?? 0);
        let topPct = 50 + Math.sin(angle) * radiusPct + (JIT_T[k % JIT_T.length] ?? 0);
        leftPct = Math.min(93, Math.max(7, leftPct));
        topPct = Math.min(93, Math.max(7, topPct));
        const tier = SIZE_TIERS[idx % SIZE_TIERS.length] ?? SIZE_TIERS[0];
        const delay = reducedMotion ? 0 : (k % 5) * 0.42;

        const thumb = (
          <div
            className={`relative overflow-hidden rounded-2xl border border-emerald-500/25 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.75)] bg-black/40 ring-1 ring-white/10 ${tier}`}
          >
            <Image src={img.url} alt="" fill className="object-cover" sizes="120px" unoptimized />
          </div>
        );

        return (
          <div
            key={img.url + idx}
            className="absolute z-[1]"
            style={{ left: `${leftPct}%`, top: `${topPct}%` }}
          >
            <motion.div
              className="-translate-x-1/2 -translate-y-1/2"
              initial={false}
              animate={
                reducedMotion
                  ? {}
                  : {
                      y: [0, -6, 0],
                      rotate: [-1.8, 1.8, -1.8],
                    }
              }
              transition={{
                repeat: Infinity,
                duration: 8 + ((k % 4) + 3) * 0.85,
                delay: reducedMotion ? 0 : delay,
                ease: "easeInOut",
              }}
            >
              {thumb}
            </motion.div>
          </div>
        );
      })}

      <div className="absolute left-1/2 top-1/2 z-10 aspect-square w-[40%] max-w-[13rem] -translate-x-1/2 -translate-y-1/2">
        <div className="relative h-full w-full overflow-hidden rounded-[1.35rem] border border-emerald-400/40 bg-black/70 shadow-[0_22px_64px_-20px_rgba(16,185,129,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] ring-2 ring-black/70">
          <AnimatePresence mode="wait">
            <motion.div
              key={spotlightItem.url}
              initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.96 }}
              transition={{ duration: reducedMotion ? 0.08 : 0.35 }}
              className="absolute inset-0"
            >
              <Image
                src={spotlightItem.url}
                alt={spotlightItem.alt?.trim() || "Gallery highlight"}
                fill
                className="object-cover"
                sizes="280px"
                loading="lazy"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export function GalleryOpenFullLink() {
  return (
    <div className="mt-8 flex justify-center">
      <Link
        href="/gallery"
        prefetch={false}
        className="inline-flex items-center gap-2 rounded-full border border-emerald-500/45 bg-emerald-500/[0.12] px-5 py-2.5 text-sm font-semibold text-emerald-100 shadow-[0_0_28px_-8px_rgba(52,211,153,0.55)] transition-transform hover:border-emerald-400/65 hover:bg-emerald-500/[0.18] active:scale-[0.98]"
      >
        Open full gallery
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
