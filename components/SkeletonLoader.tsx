"use client";

import { motion } from "framer-motion";

// Shimmer animation component
const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
);

// Hero Skeleton
export function HeroSkeleton({ accentColor }: { accentColor: string }) {
  return (
    <div className="relative w-full h-[60vh] overflow-hidden bg-gradient-to-br from-gray-900 to-black">
      <div className="absolute inset-0">
        <div className="relative w-full h-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-800 via-gray-900 to-black" />
          <Shimmer />
        </div>
      </div>
      {/* Chips skeleton */}
      <div className="absolute top-4 left-0 right-0 z-20 px-4">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 h-10 w-24 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 relative overflow-hidden"
            >
              <Shimmer />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Menu Card Skeleton
export function MenuCardSkeleton() {
  return (
    <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-4 shadow-xl">
      <div className="h-5 w-20 bg-white/10 rounded mb-3 relative overflow-hidden">
        <Shimmer />
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-3 min-w-[180px] relative overflow-hidden"
          >
            <div className="w-14 h-14 rounded-lg bg-white/10 relative overflow-hidden">
              <Shimmer />
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-white/10 rounded relative overflow-hidden">
                <Shimmer />
              </div>
              <div className="h-3 w-16 bg-white/10 rounded relative overflow-hidden">
                <Shimmer />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Photos Strip Skeleton
export function PhotosStripSkeleton({ accentColor }: { accentColor: string }) {
  return (
    <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 w-20 bg-white/10 rounded relative overflow-hidden">
          <Shimmer />
        </div>
        <div className="h-4 w-16 rounded relative overflow-hidden" style={{ backgroundColor: `${accentColor}20` }}>
          <Shimmer />
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-32 h-32 flex-shrink-0 rounded-xl bg-white/10 relative overflow-hidden"
          >
            <Shimmer />
          </div>
        ))}
      </div>
    </div>
  );
}

// Location Card Skeleton
export function LocationCardSkeleton() {
  return (
    <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-4 shadow-xl overflow-hidden">
      <div className="h-5 w-24 bg-white/10 rounded mb-3 relative overflow-hidden">
        <Shimmer />
      </div>
      <div className="h-[150px] rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 mb-3 relative overflow-hidden">
        <Shimmer />
      </div>
      <div className="flex items-start gap-3">
        <div className="w-4 h-4 rounded bg-white/10 relative overflow-hidden">
          <Shimmer />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-4 w-full bg-white/10 rounded relative overflow-hidden">
            <Shimmer />
          </div>
          <div className="h-3 w-32 bg-white/10 rounded relative overflow-hidden">
            <Shimmer />
          </div>
        </div>
      </div>
    </div>
  );
}

// CTA Skeleton
export function CTASkeleton({ accentColor }: { accentColor: string }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-2xl bg-black/60 border-t border-white/10 p-3" style={{ height: '64px' }}>
      <div
        className="w-full h-full rounded-2xl relative overflow-hidden"
        style={{ backgroundColor: `${accentColor}40` }}
      >
        <Shimmer />
      </div>
    </div>
  );
}
