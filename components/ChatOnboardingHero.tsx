"use client";

import ChatFlyerCarousel from "@/components/ChatFlyerCarousel";
import ChatQuickActions, { parseQuickActions } from "@/components/ChatQuickActions";
import { cleanEventsLabel, getChatNeonTheme } from "@/lib/venue-chat-theme";
import type { ChatMessageLike, FlyerItem } from "@/lib/venue-chat-ui-helpers";

type ChatOnboardingHeroProps = {
  venueName: string;
  hostName?: string | null;
  quickActionsMessage?: ChatMessageLike | null;
  eventsMessage?: ChatMessageLike | null;
  eventsFallbackText?: string | null;
  accentColor: string;
  selectedEventId?: string | null;
  onSelectFlyer?: (item: FlyerItem) => void;
  onBook?: () => void;
  onMenu?: () => void;
  onPricing?: () => void;
  onWebsite?: () => void;
};

export default function ChatOnboardingHero({
  venueName,
  hostName,
  quickActionsMessage,
  eventsMessage,
  eventsFallbackText,
  accentColor,
  selectedEventId,
  onSelectFlyer,
  onBook,
  onMenu,
  onPricing,
  onWebsite,
}: ChatOnboardingHeroProps) {
  const theme = getChatNeonTheme(accentColor);
  const venue = venueName.trim() || "our venue";
  const host = hostName?.trim() || null;
  const quickActions = quickActionsMessage ? parseQuickActions(quickActionsMessage.metadata) : [];
  const flyers = eventsMessage
    ? (() => {
        const meta = eventsMessage.metadata;
        if (meta?.type !== "flyers" || !Array.isArray(meta.items)) return [];
        const items: FlyerItem[] = [];
        for (const raw of meta.items) {
          if (!raw || typeof raw !== "object") continue;
          const item = raw as { id?: string; imageUrl?: string; title?: string | null; dateLine?: string | null };
          if (!item.imageUrl) continue;
          const label = [item.title?.trim(), item.dateLine?.trim()].filter(Boolean).join(" · ");
          items.push({ id: item.id ?? eventsMessage.id, imageUrl: item.imageUrl, label: label || undefined });
        }
        return items;
      })()
    : [];

  const eventsLabel = cleanEventsLabel(eventsMessage?.content);

  return (
    <div className="relative space-y-4 pb-1 pt-0.5">
      {/* 1 · Welcome */}
      <div className="space-y-2">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: theme.cyan }}
        >
          Dear Guest
        </p>
        <h2 className="text-[17px] font-semibold leading-tight tracking-[-0.02em] text-white">
          Welcome to {venue}
        </h2>
        <p className="text-[15px] font-normal leading-[1.45] text-white/90">
          {host ? (
            <>
              I&apos;m{" "}
              <span className="font-semibold" style={{ color: theme.cyan }}>
                {host}
              </span>
              , your host here — happy to help you plan the perfect night out.
            </>
          ) : (
            <>
              I&apos;m your{" "}
              <span className="font-semibold" style={{ color: theme.cyan }}>
                friendly neighbourhood host
              </span>{" "}
              — happy to help you plan the perfect night out.
            </>
          )}
        </p>
        <p className="text-[14px] font-medium text-white/70">How may I assist you today?</p>
      </div>

      {quickActions.length > 0 ? (
        <div className="space-y-2">
          <ChatQuickActions
            actions={quickActions}
            accentColor={accentColor}
            bookGradient={theme.bookGradient}
            onBook={onBook}
            onMenu={onMenu}
            onPricing={onPricing}
            onWebsite={onWebsite}
          />
        </div>
      ) : null}

      {flyers.length > 0 ? (
        <div className="space-y-2">
          {eventsLabel ? (
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/35">{eventsLabel}</p>
          ) : null}
          <ChatFlyerCarousel
            items={flyers}
            size="md"
            selectable
            selectedId={selectedEventId}
            onSelect={onSelectFlyer}
            accentColor={theme.cyan}
          />
        </div>
      ) : eventsFallbackText ? (
        <p className="text-[12px] text-white/45">{eventsFallbackText}</p>
      ) : null}
    </div>
  );
}
