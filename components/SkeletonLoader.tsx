"use client";

import { motion } from "framer-motion";

// Shimmer animation component
const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
);

// Hero Skeleton
export function HeroSkeleton({ accentColor }: { accentColor: string }) {
  return (
    <div className="relative w-full h-[65vh] overflow-hidden bg-gradient-to-br from-gray-900 to-black">
      <div className="absolute inset-0">
        <div className="relative w-full h-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-800 via-gray-900 to-black" />
          <Shimmer />
        </div>
      </div>
      {/* Dropdown pill skeleton */}
      <div className="absolute top-4 left-4 z-20">
        <div className="h-10 w-32 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 relative overflow-hidden">
          <Shimmer />
        </div>
      </div>
    </div>
  );
}

// Menu Card Skeleton (Compact - 40-50% reduced height)
export function MenuCardSkeleton() {
  return (
    <div className="backdrop-blur-md bg-white/5 rounded-2xl border border-white/10 p-3 shadow-xl">
      <div className="h-4 w-16 bg-white/10 rounded mb-2 relative overflow-hidden">
        <Shimmer />
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 flex items-center gap-2 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-2 min-w-[160px] relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-lg bg-white/10 relative overflow-hidden">
              <Shimmer />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-20 bg-white/10 rounded relative overflow-hidden">
                <Shimmer />
              </div>
              <div className="h-2.5 w-12 bg-white/10 rounded relative overflow-hidden">
                <Shimmer />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Photos Masonry Grid Skeleton
export function PhotosStripSkeleton({ accentColor }: { accentColor: string }) {
  return (
    <div className="backdrop-blur-md bg-white/5 rounded-2xl border border-white/10 p-3 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-16 bg-white/10 rounded relative overflow-hidden">
          <Shimmer />
        </div>
        <div className="h-3 w-14 rounded relative overflow-hidden" style={{ backgroundColor: `${accentColor}20` }}>
          <Shimmer />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className={`rounded-xl bg-white/10 relative overflow-hidden ${
              i % 3 === 0 ? 'row-span-2' : ''
            }`}
            style={{ aspectRatio: i % 3 === 0 ? '3/4' : '1' }}
          >
            <Shimmer />
          </div>
        ))}
      </div>
    </div>
  );
}

// Location Card Skeleton (Compact)
export function LocationCardSkeleton() {
  return (
    <div className="backdrop-blur-md bg-white/5 rounded-2xl border border-white/10 p-3 shadow-xl overflow-hidden">
      <div className="h-4 w-20 bg-white/10 rounded mb-2 relative overflow-hidden">
        <Shimmer />
      </div>
      <div className="h-24 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 mb-2 relative overflow-hidden">
        <Shimmer />
      </div>
      <div className="flex items-start gap-2">
        <div className="w-3.5 h-3.5 rounded bg-white/10 relative overflow-hidden">
          <Shimmer />
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-full bg-white/10 rounded relative overflow-hidden">
            <Shimmer />
          </div>
          <div className="h-2.5 w-28 bg-white/10 rounded relative overflow-hidden">
            <Shimmer />
          </div>
        </div>
      </div>
    </div>
  );
}

// CTA Skeleton (Premium Pill)
export function CTASkeleton({ accentColor }: { accentColor: string }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div
        className="w-full h-12 rounded-full relative overflow-hidden backdrop-blur-xl border border-white/20"
        style={{ backgroundColor: `${accentColor}40` }}
      >
        <Shimmer />
      </div>
    </div>
  );
}
