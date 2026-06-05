"use client";

import Image from "next/image";
import type { FlyerItem } from "@/lib/venue-chat-ui-helpers";

type ChatFlyerCarouselProps = {
  items: FlyerItem[];
  size?: "sm" | "md";
  selectable?: boolean;
  selectedId?: string | null;
  onSelect?: (item: FlyerItem) => void;
  accentColor?: string;
};

export default function ChatFlyerCarousel({
  items,
  size = "md",
  selectable = false,
  selectedId,
  onSelect,
  accentColor = "#f97316",
}: ChatFlyerCarouselProps) {
  if (items.length === 0) return null;

  const cardW = size === "md" ? "w-[118px]" : "w-[96px]";

  return (
    <div
      className={`flex gap-2.5 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory ${
        items.length === 1 ? "" : "pr-1"
      }`}
    >
      {items.map((flyer) => {
        const selected = selectable && selectedId === flyer.id;
        const inner = (
          <>
            <div
              className={`relative aspect-[4/5] overflow-hidden rounded-[14px] shadow-lg transition-all ${
                selected ? "border-2" : "border border-white/[0.12]"
              }`}
              style={
                selected
                  ? {
                      borderColor: accentColor,
                      boxShadow: `0 8px 28px ${accentColor}33, inset 0 1px 0 rgba(255,255,255,0.1)`,
                    }
                  : {
                      background: "rgba(0,0,0,0.35)",
                      boxShadow: "0 6px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
                    }
              }
            >
              <Image
                src={flyer.imageUrl}
                alt={flyer.label ?? "Event flyer"}
                fill
                className="object-cover"
                sizes={size === "md" ? "118px" : "96px"}
                unoptimized
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              {selected ? (
                <span
                  className="absolute bottom-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-black shadow-md"
                  style={{ background: `linear-gradient(145deg, ${accentColor}, ${accentColor}dd)` }}
                >
                  ✓
                </span>
              ) : null}
            </div>
            {flyer.label ? (
              <p className="mt-1.5 line-clamp-2 text-[10px] font-medium leading-tight tracking-wide text-white/55">
                {flyer.label}
              </p>
            ) : null}
          </>
        );

        if (selectable && onSelect) {
          return (
            <button
              key={`${flyer.id}-${flyer.imageUrl}`}
              type="button"
              onClick={() => onSelect(flyer)}
              className={`${cardW} shrink-0 snap-start text-left transition active:scale-[0.97]`}
            >
              {inner}
            </button>
          );
        }

        return (
          <div key={`${flyer.id}-${flyer.imageUrl}`} className={`${cardW} shrink-0 snap-start`}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
