"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ChatMessageBubble from "@/components/ChatMessageBubble";
import ChatOnboardingHero from "@/components/ChatOnboardingHero";
import ChatTypingIndicator from "@/components/ChatTypingIndicator";
import ChatAnimatedPlaceholder, { DEFAULT_HINTS } from "@/components/ChatAnimatedPlaceholder";
import {
  CLUB_ROGUE_CHAT_HINTS,
  clubRogueChatVenueName,
  isClubRogueBrand,
} from "@/lib/club-rogue";
import EventQuickBookSheet, { type EventQuickBookOffer } from "@/components/EventQuickBookSheet";
import { getChatNeonTheme } from "@/lib/venue-chat-theme";
import { clientActionUserMessage, type ClientChatActionType } from "@/lib/venue-chat-copy";
import {
  isPosterOnlyMessage,
  lastConfirmedMessageId,
  splitGuestOnboarding,
  type ChatMessageLike,
  type FlyerItem,
} from "@/lib/venue-chat-ui-helpers";
import { getFullPhoneNumber } from "@/lib/outlet-contacts";
import {
  buildOptimisticOnboardingMessages,
  isOptimisticMessageId,
  type BootstrapOffer,
} from "@/lib/venue-chat-bootstrap";
import type { ChatSessionPayload } from "@/lib/venue-chat-session";

type ChatLead = {
  id: string;
  displayLabel: string;
  guestName: string | null;
  contactNumber: string | null;
  partySize: number | null;
  selectedEventId: string | null;
  status: string;
  reservationId: string | null;
};

type ChatMessage = ChatMessageLike & {
  role: "USER" | "ASSISTANT" | "MANAGER" | "SYSTEM";
};

type ChatMeta = {
  venueName: string;
  hostName: string | null;
};

export type VenueChatWidgetHandle = {
  selectLandingEvent: (item: FlyerItem) => void;
  expandChat: () => void;
};

type VenueChatWidgetProps = {
  brandId: string;
  venueShortName: string;
  accentColor: string;
  contactPhone: string;
  whatsappMessage?: string;
  mapUrl?: string | null;
  address?: string;
  hasMenus?: boolean;
  hostName?: string | null;
  onOpenMenu?: () => void;
  onOpenEventBook?: (eventId: string) => void;
  layout?: "fab" | "embedded" | "landing";
  initialSnapshot?: ChatSessionPayload;
};

const EMBEDDED_PREVIEW_H = 280;

function ChatPanel({
  accentColor,
  displayVenueName,
  contactPhone,
  placeholderHints,
  showTyping,
  lead,
  loading,
  onboarding,
  conversationMessages,
  chatMeta,
  scrollRef,
  error,
  input,
  setInput,
  sending,
  aiPending,
  inputFocused,
  setInputFocused,
  send,
  selectEvent,
  bookTable,
  openMenu,
  openPricing,
  openWebsite,
  onBookingLink,
  compactHeader,
  onExpand,
  onClose,
  showClose,
}: {
  accentColor: string;
  displayVenueName: string;
  placeholderHints: string[];
  contactPhone: string;
  showTyping: boolean;
  lead: ChatLead | null;
  loading: boolean;
  onboarding: ReturnType<typeof splitGuestOnboarding>;
  conversationMessages: ChatMessage[];
  chatMeta: ChatMeta;
  scrollRef: React.Ref<HTMLDivElement>;
  error: string | null;
  input: string;
  setInput: (v: string) => void;
  sending: boolean;
  aiPending: boolean;
  inputFocused: boolean;
  setInputFocused: (v: boolean) => void;
  send: () => void;
  selectEvent: (item: FlyerItem) => void;
  bookTable: () => void;
  openMenu: () => void;
  openPricing: () => void;
  openWebsite: () => void;
  onBookingLink: (link: { kind: "event" | "table"; eventId?: string; url: string }) => void;
  compactHeader?: boolean;
  onExpand?: () => void;
  onClose?: () => void;
  showClose?: boolean;
}) {
  const theme = getChatNeonTheme(accentColor);
  const venueCaps = displayVenueName.toUpperCase();
  const showAnimatedPlaceholder = !input.trim();
  const venueInitial = venueCaps.charAt(0) || "V";

  return (
    <>
      <div
        className={`relative flex shrink-0 items-center gap-3 px-4 backdrop-blur-xl ${compactHeader ? "py-2.5" : "py-3"}`}
        style={{ background: theme.headerGradient }}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white/85"
          style={{
            background: "rgba(255,255,255,0.05)",
            boxShadow: `0 0 0 1px rgba(255,255,255,0.1), 0 0 18px ${theme.cyan}28`,
          }}
        >
          {venueInitial}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[13px] font-bold tracking-[0.16em]"
            style={{
              background: theme.titleGradient,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {venueCaps}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            {showTyping ? (
              <span className="text-[11px] font-medium text-violet-300">Typing…</span>
            ) : lead?.reservationId ? (
              <span className="text-[11px] font-medium text-cyan-300/80">
                Ref #{lead.reservationId.slice(-6).toUpperCase()}
              </span>
            ) : (
              <>
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    background: theme.liveDot,
                    boxShadow: `0 0 8px ${theme.liveDot}`,
                  }}
                />
                <span className="text-[11px] font-medium tracking-wide text-white/35">Live now</span>
              </>
            )}
          </div>
        </div>
        {onExpand ? (
          <button
            type="button"
            onClick={onExpand}
            className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-wide text-white/50"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            Expand
          </button>
        ) : null}
        <a
          href={`tel:+${getFullPhoneNumber(contactPhone)}`}
          className="shrink-0 rounded-full p-2 text-white/45"
          style={{ background: "rgba(255,255,255,0.04)" }}
          aria-label="Call"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
        </a>
        {showClose && onClose ? (
          <button type="button" onClick={onClose} className="rounded-full px-2 py-1 text-[11px] text-white/45">
            ✕
          </button>
        ) : null}
      </div>

      <div
        ref={scrollRef}
        className={`min-h-0 overflow-y-auto overscroll-contain px-4 py-2 space-y-2 ${
          compactHeader ? "" : "flex-1"
        }`}
        style={{
          ...(compactHeader ? { height: EMBEDDED_PREVIEW_H } : {}),
          background: `#040408`,
          backgroundImage: theme.mesh,
        }}
      >
        {loading && !onboarding.hasOnboarding ? (
          <div className="py-6">
            <ChatTypingIndicator label="Connecting…" align="left" accentColor={theme.cyan} />
          </div>
        ) : (
          <>
            {onboarding.hasOnboarding ? (
              <ChatOnboardingHero
                venueName={displayVenueName}
                hostName={chatMeta.hostName}
                quickActionsMessage={onboarding.quickActionsMessage}
                eventsMessage={onboarding.eventsMessage}
                eventsFallbackText={onboarding.eventsFallbackText}
                accentColor={accentColor}
                selectedEventId={lead?.selectedEventId ?? null}
                onSelectFlyer={selectEvent}
                onBook={bookTable}
                onMenu={openMenu}
                onPricing={openPricing}
                onWebsite={openWebsite}
              />
            ) : null}

            {conversationMessages.length > 0 ? (
              <div className="space-y-2.5 pt-2">
                {conversationMessages.map((m) => (
                  <ChatMessageBubble
                    key={m.id}
                    m={m}
                    perspective="guest"
                    accentColor={theme.cyan}
                    userBubbleGradient={theme.userBubble}
                    variant="minimal"
                    selectedEventId={lead?.selectedEventId ?? null}
                    onSelectFlyer={selectEvent}
                    onBook={bookTable}
                    onMenu={openMenu}
                    onBookingLink={onBookingLink}
                  />
                ))}
              </div>
            ) : null}

            {showTyping ? (
              <ChatTypingIndicator label="Typing…" align="left" accentColor={theme.cyan} />
            ) : null}
          </>
        )}
        {error ? (
          <p className="rounded-xl border border-red-400/15 bg-red-500/10 px-3 py-2 text-center text-[11px] text-red-200/90">
            {error}
          </p>
        ) : null}
      </div>

      <div
        className="shrink-0 px-4 py-3"
        style={{
          background: "linear-gradient(0deg, rgba(0,0,0,0.6) 0%, rgba(6,6,10,0.95) 100%)",
        }}
      >
        <div className="relative flex gap-2.5">
          <div
            className={`relative min-w-0 flex-1 overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.05] backdrop-blur-xl transition-[box-shadow,border-color] duration-300 ${
              inputFocused ? "ring-1 ring-cyan-400/35" : ""
            }`}
            style={
              inputFocused
                ? {
                    boxShadow:
                      "0 0 0 1px rgba(34,211,238,0.2), 0 0 24px rgba(34,211,238,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
                  }
                : {
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                  }
            }
          >
            <ChatAnimatedPlaceholder
              active={showAnimatedPlaceholder}
              hints={placeholderHints}
              className="absolute left-4 top-3.5 z-0 max-w-[calc(100%-2rem)]"
            />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder=""
              rows={1}
              maxLength={800}
              disabled={sending}
              className="relative z-[1] block max-h-[120px] min-h-[48px] w-full resize-none rounded-[22px] border-0 bg-transparent px-4 py-3 text-[16px] font-normal leading-snug tracking-wide text-white caret-cyan-300 outline-none disabled:opacity-50"
              style={{ WebkitTextSizeAdjust: "100%" }}
            />
          </div>
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || !input.trim()}
            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full text-base font-bold text-white disabled:opacity-30"
            style={{
              background: theme.sendGradient,
              boxShadow: "0 8px 28px rgba(34,211,238,0.35)",
            }}
          >
            {aiPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black/80" />
            ) : (
              "↑"
            )}
          </button>
        </div>
      </div>
    </>
  );
}

const VenueChatWidget = forwardRef<VenueChatWidgetHandle, VenueChatWidgetProps>(function VenueChatWidget(
  {
    brandId,
    venueShortName,
    accentColor,
    contactPhone,
    whatsappMessage,
    mapUrl,
    address,
    hasMenus = false,
    hostName: hostNameProp,
    onOpenMenu,
    onOpenEventBook,
    layout = "fab",
    initialSnapshot,
  },
  ref
) {
  const router = useRouter();
  const isEmbedded = layout === "embedded";
  const isLanding = layout === "landing";

  const [offers, setOffers] = useState<EventQuickBookOffer[]>([]);
  const [offersLoaded, setOffersLoaded] = useState(false);
  const [eventSheetId, setEventSheetId] = useState<string | null>(null);
  const offersPromiseRef = useRef<Promise<EventQuickBookOffer[]> | null>(null);

  const loadOffers = useCallback(async (): Promise<EventQuickBookOffer[]> => {
    if (offersLoaded && offers.length) return offers;
    if (offersPromiseRef.current) return offersPromiseRef.current;
    offersPromiseRef.current = fetch(`/api/venues/${brandId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = (data?.venue?.offers ?? []) as EventQuickBookOffer[];
        setOffers(list);
        setOffersLoaded(true);
        return list;
      })
      .catch(() => [] as EventQuickBookOffer[])
      .finally(() => {
        offersPromiseRef.current = null;
      });
    return offersPromiseRef.current;
  }, [brandId, offersLoaded, offers.length]);

  const handleBookingLink = useCallback(
    async (link: { kind: "event" | "table"; eventId?: string; url: string }) => {
      if (link.kind === "table") {
        router.push(link.url.startsWith("/") ? link.url : `/${brandId}/book`);
        return;
      }
      const eventId = link.eventId;
      if (!eventId) return;
      if (onOpenEventBook) {
        onOpenEventBook(eventId);
        return;
      }
      await loadOffers();
      setEventSheetId(eventId);
    },
    [brandId, loadOffers, onOpenEventBook, router]
  );

  const optimisticSeed = useCallback((): ChatMessage[] => {
    let offers: BootstrapOffer[] = [];
    if (initialSnapshot?.messages) {
      for (const m of initialSnapshot.messages) {
        if (m.metadata?.type === "flyers" && Array.isArray(m.metadata.items)) {
          for (const raw of m.metadata.items) {
            if (!raw || typeof raw !== "object") continue;
            const item = raw as BootstrapOffer;
            if (item.imageUrl) offers.push(item);
          }
        }
      }
    }
    return buildOptimisticOnboardingMessages({
      venueName:
        clubRogueChatVenueName(brandId) ??
        initialSnapshot?.chat?.venueName ??
        venueShortName,
      hostName: initialSnapshot?.chat?.hostName ?? hostNameProp ?? null,
      contactPhone,
      whatsappMessage,
      mapUrl: mapUrl ?? null,
      address,
      hasMenus,
      offers,
    }) as ChatMessage[];
  }, [
    brandId,
    initialSnapshot,
    venueShortName,
    hostNameProp,
    contactPhone,
    whatsappMessage,
    mapUrl,
    address,
    hasMenus,
  ]);

  const [open, setOpen] = useState(isLanding || isEmbedded);
  const [loading, setLoading] = useState(false);
  const [lead, setLead] = useState<ChatLead | null>(() => initialSnapshot?.lead ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    initialSnapshot?.messages?.length
      ? (initialSnapshot.messages as ChatMessage[])
      : optimisticSeed()
  );
  const [chatMeta, setChatMeta] = useState<ChatMeta>(() => ({
    venueName:
      clubRogueChatVenueName(brandId) ??
      initialSnapshot?.chat?.venueName ??
      venueShortName,
    hostName: initialSnapshot?.chat?.hostName ?? hostNameProp ?? null,
  }));
  const displayVenueName = useMemo(
    () =>
      clubRogueChatVenueName(brandId) ??
      (chatMeta.venueName?.trim() || venueShortName),
    [brandId, chatMeta.venueName, venueShortName]
  );
  const placeholderHints = useMemo(
    () => (isClubRogueBrand(brandId) ? CLUB_ROGUE_CHAT_HINTS : DEFAULT_HINTS),
    [brandId]
  );
  const [input, setInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiPending, setAiPending] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bootedRef = useRef(false);
  const lastMsgIdRef = useRef<string>("");
  const pollInFlightRef = useRef(false);

  const filteredMessages = useMemo(
    () => messages.filter((m) => !isPosterOnlyMessage(m)),
    [messages]
  );
  const onboarding = useMemo(() => splitGuestOnboarding(filteredMessages), [filteredMessages]);
  const conversationMessages = onboarding.conversation as ChatMessage[];
  const showTyping = aiPending && !loading;
  const sessionActive = isEmbedded || isLanding || open;

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  const syncPollCursor = useCallback((list: ChatMessage[]) => {
    const id = lastConfirmedMessageId(list);
    if (id) lastMsgIdRef.current = id;
  }, []);

  const mergeMessages = (prev: ChatMessage[], incoming: ChatMessage[]) => {
    const map = new Map(prev.map((m) => [m.id, m]));
    for (const m of incoming) map.set(m.id, m);
    return [...map.values()].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  };

  const applyPayload = (data: {
    lead?: ChatLead;
    messages?: ChatMessage[];
    delta?: boolean;
    chat?: { venueName?: string; hostName?: string | null };
  }) => {
    if (data.lead) setLead(data.lead);
    if (data.chat) {
      setChatMeta((prev) => ({
        venueName: data.chat?.venueName?.trim() || prev.venueName,
        hostName: data.chat?.hostName ?? prev.hostName,
      }));
    }
    if (data.messages?.length) {
      setMessages((prev) => {
        const base = data.delta ? prev.filter((m) => !isOptimisticMessageId(m.id)) : [];
        const merged = data.delta
          ? mergeMessages(base, data.messages!)
          : (data.messages! as ChatMessage[]);
        syncPollCursor(merged);
        return merged;
      });
    }
  };

  const loadSession = useCallback(async () => {
    setError(null);
    try {
      const utm = typeof window !== "undefined" ? window.location.search : "";
      const res = await fetch(`/api/venues/${brandId}/chat${utm}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load chat");
      applyPayload(data);
      scrollToBottom();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chat unavailable");
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  const poll = useCallback(async () => {
    if (!sessionActive || document.hidden || pollInFlightRef.current) return;
    if (!lastMsgIdRef.current) return;
    pollInFlightRef.current = true;
    try {
      const res = await fetch(
        `/api/venues/${brandId}/chat?after=${encodeURIComponent(lastMsgIdRef.current)}`,
        { credentials: "include" }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages?.length) {
        applyPayload({ ...data, delta: true });
        scrollToBottom();
      } else if (data.lead) {
        setLead(data.lead);
      }
    } catch {
      /* ignore */
    } finally {
      pollInFlightRef.current = false;
    }
  }, [brandId, sessionActive]);

  useEffect(() => {
    if (initialSnapshot) {
      bootedRef.current = true;
      syncPollCursor(initialSnapshot.messages as ChatMessage[]);
      return;
    }
    const shouldBootNow = isLanding || isEmbedded || open;
    if (shouldBootNow && !bootedRef.current) {
      bootedRef.current = true;
      void loadSession();
    }
  }, [initialSnapshot, loadSession, isLanding, isEmbedded, open]);

  useEffect(() => {
    if (!sessionActive || document.hidden) return;
    void poll();
    const id = window.setInterval(() => void poll(), 2000);
    const onVis = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [sessionActive, poll]);

  useEffect(() => {
    if (sessionActive) scrollToBottom();
  }, [messages, sessionActive, showTyping]);

  useEffect(() => {
    if (!open && !isLanding) return;
    const prev = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = prev;
    };
  }, [open, isLanding]);

  const postChat = async (
    body: Record<string, unknown>,
    opts?: { awaitAi?: boolean; optimisticUserText?: string }
  ) => {
    if (opts?.optimisticUserText) {
      const userText = opts.optimisticUserText;
      setMessages((m) => [
        ...m,
        {
          id: `tmp-${Date.now()}`,
          role: "USER" as const,
          content: userText,
          imageUrl: null,
          metadata: null,
          createdAt: new Date().toISOString(),
        },
      ]);
      scrollToBottom();
    }

    if (opts?.awaitAi) setAiPending(true);
    else setActionBusy(true);
    setError(null);

    try {
      const res = await fetch(`/api/venues/${brandId}/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setMessages((m) => m.filter((x) => !x.id.startsWith("tmp-")));
      applyPayload(data);
      scrollToBottom();
      void poll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setAiPending(false);
      setActionBusy(false);
    }
  };

  const postAction = (type: ClientChatActionType) => {
    if (actionBusy || aiPending) return;
    postChat({ action: { type } }, { optimisticUserText: clientActionUserMessage(type) });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || actionBusy || aiPending) return;
    setInput("");
    setMessages((m) => [
      ...m,
      {
        id: `tmp-${Date.now()}`,
        role: "USER",
        content: text,
        imageUrl: null,
        metadata: null,
        createdAt: new Date().toISOString(),
      },
    ]);
    scrollToBottom();
    await postChat({ message: text }, { awaitAi: true });
  };

  const selectEvent = useCallback(
    (item: FlyerItem) => {
      if (actionBusy || aiPending) return;
      postChat(
        {
          action: {
            type: "select_event",
            offerId: item.id,
            label: item.label,
            imageUrl: item.imageUrl,
          },
        },
        {
          optimisticUserText: `Interested in ${item.label ?? "this event"}`,
          awaitAi: false,
        }
      );
    },
    [actionBusy, aiPending]
  );

  const bookTable = () => postAction("book_table");

  const openMenu = () => {
    if (onOpenMenu) {
      onOpenMenu();
      return;
    }
    postAction("ask_menu");
  };

  const openPricing = () => postAction("pricing_offers");

  const openWebsite = () => postAction("explore_website");

  useImperativeHandle(ref, () => ({
    selectLandingEvent: (item: FlyerItem) => selectEvent(item),
    expandChat: () => setOpen(true),
  }));

  const panelProps = {
    accentColor,
    displayVenueName,
    placeholderHints,
    contactPhone,
    showTyping,
    lead,
    loading,
    onboarding,
    conversationMessages,
    chatMeta,
    scrollRef,
    error,
    input,
    setInput,
    sending: actionBusy || aiPending,
    aiPending,
    inputFocused,
    setInputFocused,
    send,
    selectEvent,
    bookTable,
    openMenu,
    openPricing,
    openWebsite,
    onBookingLink: handleBookingLink,
  };

  const eventSheet = !onOpenEventBook ? (
    <EventQuickBookSheet
      brandId={brandId}
      offers={offers}
      eventId={eventSheetId}
      isOpen={Boolean(eventSheetId)}
      onClose={() => setEventSheetId(null)}
      initialName={lead?.guestName ?? ""}
      initialPhone={lead?.contactNumber ?? ""}
    />
  ) : null;

  const fabTheme = getChatNeonTheme(accentColor);

  if (isLanding) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col pt-[env(safe-area-inset-top)]">
        <ChatPanel {...panelProps} />
        {eventSheet}
      </div>
    );
  }

  return (
    <>
      {!isEmbedded ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed z-[95] flex h-14 w-14 items-center justify-center rounded-full transition-transform active:scale-95 sm:h-[3.25rem] sm:w-[3.25rem]"
          style={{
            right: "max(1rem, env(safe-area-inset-right))",
            bottom: "calc(5.75rem + env(safe-area-inset-bottom))",
            background: fabTheme.sendGradient,
            boxShadow: "0 12px 40px rgba(34,211,238,0.4), 0 0 0 1px rgba(255,255,255,0.1)",
          }}
          aria-label={`Chat with ${displayVenueName}`}
        >
          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>
      ) : null}

      {isEmbedded ? (
        <div className="overflow-hidden rounded-[22px]" style={{ background: "#040408" }}>
          <ChatPanel {...panelProps} compactHeader onExpand={() => setOpen(true)} />
        </div>
      ) : null}

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Close chat"
              className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal
              className="fixed inset-0 z-[120] mx-auto flex w-full max-w-md flex-col pt-[env(safe-area-inset-top)]"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 360 }}
              style={{
                background: "#040408",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 -30px 80px rgba(34,211,238,0.08)",
              }}
            >
              <ChatPanel {...panelProps} showClose onClose={() => setOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {eventSheet}
    </>
  );
});

export default VenueChatWidget;
