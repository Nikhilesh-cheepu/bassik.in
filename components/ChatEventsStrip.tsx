"use client";

import ChatFlyerCarousel from "@/components/ChatFlyerCarousel";
import type { FlyerItem } from "@/lib/venue-chat-ui-helpers";

type ChatEventsStripProps = {
  items: FlyerItem[];
  selectable?: boolean;
  selectedId?: string | null;
  onSelect?: (item: FlyerItem) => void;
};

export default function ChatEventsStrip({
  items,
  selectable,
  selectedId,
  onSelect,
}: ChatEventsStripProps) {
  if (items.length === 0) return null;

  return (
    <div className="shrink-0 border-b border-white/10 bg-[#111b21]/90 px-3 py-2.5 backdrop-blur-sm">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/45">
        Events · swipe {selectable ? "· tap to pick" : ""}
      </p>
      <ChatFlyerCarousel
        items={items}
        size="md"
        selectable={selectable}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </div>
  );
}
