"use client";

import ChatFlyerCarousel from "@/components/ChatFlyerCarousel";
import ChatQuickActions, { parseQuickActions } from "@/components/ChatQuickActions";
import {
  bubbleSide,
  flyersForMessage,
  formatChatTime,
  isCustomerRole,
  type ChatMessageLike,
  type ChatPerspective,
  type FlyerItem,
} from "@/lib/venue-chat-ui-helpers";
import { getFullPhoneNumber } from "@/lib/outlet-contacts";

export type ChatBubbleMessage = ChatMessageLike & {
  role: string;
};

function isFlyersSelectable(m: ChatBubbleMessage): boolean {
  return m.metadata?.type === "flyers" && m.metadata.selectable !== false;
}

type ChatMessageBubbleProps = {
  m: ChatBubbleMessage;
  perspective?: ChatPerspective;
  accentColor?: string;
  size?: "sm" | "md";
  variant?: "minimal" | "classic";
  userBubbleGradient?: string;
  selectedEventId?: string | null;
  onSelectFlyer?: (item: FlyerItem) => void;
  onBook?: () => void;
  onMenu?: () => void;
  suppressFlyers?: boolean;
};

function chatLinkFromMetadata(metadata: Record<string, unknown> | null): { url: string; label: string } | null {
  if (
    metadata &&
    (metadata.type === "booking_link" || metadata.type === "external_link") &&
    typeof metadata.url === "string"
  ) {
    return {
      url: metadata.url,
      label: typeof metadata.label === "string" ? metadata.label : "Open link →",
    };
  }
  return null;
}

export default function ChatMessageBubble({
  m,
  perspective = "guest",
  accentColor = "#f97316",
  size = "md",
  variant = "classic",
  userBubbleGradient,
  selectedEventId,
  onSelectFlyer,
  onBook,
  onMenu,
  suppressFlyers = false,
}: ChatMessageBubbleProps) {
  const side = bubbleSide(m.role, perspective);
  const isRight = side === "right";
  const isSystem = m.role === "SYSTEM";
  const isCustomer = isCustomerRole(m.role);
  const isHost = !isCustomer && !isSystem;
  const flyers = flyersForMessage(m);
  const quickActions = parseQuickActions(m.metadata);
  const callPhone =
    m.metadata?.type === "call_cta" && typeof m.metadata.phone === "string"
      ? m.metadata.phone
      : null;
  const chatLink = chatLinkFromMetadata(m.metadata);

  const hasAttachments =
    callPhone ||
    quickActions.length > 0 ||
    (flyers.length > 0 && !suppressFlyers) ||
    Boolean(chatLink);
  const minimal = variant === "minimal";

  const linkButton = chatLink ? (
    <a
      href={chatLink.url.startsWith("/") ? chatLink.url : chatLink.url}
      target={chatLink.url.startsWith("/") ? undefined : "_blank"}
      rel={chatLink.url.startsWith("/") ? undefined : "noopener noreferrer"}
      className="mt-2 inline-flex items-center rounded-full px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg"
      style={{
        background: "linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)",
        boxShadow: "0 8px 24px rgba(34,211,238,0.3)",
      }}
    >
      {chatLink.label}
    </a>
  ) : null;

  if (minimal && isHost && m.content.trim() && !quickActions.length && !(flyers.length > 0 && !suppressFlyers) && !callPhone) {
    return (
      <div className="flex justify-start pl-0.5">
        <div className="max-w-[92%]">
          <p className="whitespace-pre-wrap text-[14px] font-normal leading-[1.55] tracking-[-0.01em] text-white/88">
            {m.content}
          </p>
          {linkButton}
          <p className="mt-1 text-[10px] font-medium tracking-wide text-white/25">{formatChatTime(m.createdAt)}</p>
        </div>
      </div>
    );
  }

  if (minimal && isCustomer && m.content.trim() && !hasAttachments) {
    return (
      <div className="flex justify-end pr-0.5">
        <div
          className="max-w-[85%] rounded-[18px] rounded-br-md px-3.5 py-2 text-[14px] leading-[1.45] tracking-[-0.01em] text-white"
          style={{
            background:
              userBubbleGradient ??
              "linear-gradient(135deg, rgba(6,182,212,0.95) 0%, rgba(139,92,246,0.92) 100%)",
            boxShadow: "0 6px 20px rgba(34,211,238,0.2)",
          }}
        >
          <p className="whitespace-pre-wrap">{m.content}</p>
          <p className="mt-1 text-right text-[10px] font-medium text-white/50">{formatChatTime(m.createdAt)}</p>
        </div>
      </div>
    );
  }

  const rounded = size === "md" ? "rounded-[18px]" : "rounded-2xl";
  let bubbleClass = "";
  let bubbleStyle: React.CSSProperties = {};

  if (isSystem) {
    bubbleClass = "rounded-bl-md border border-emerald-400/20 text-emerald-100/95";
    bubbleStyle = {
      background: "linear-gradient(145deg, rgba(52,211,153,0.12) 0%, rgba(52,211,153,0.04) 100%)",
    };
  } else if (isCustomer) {
    bubbleClass = isRight ? "rounded-br-md text-white" : "rounded-bl-md border border-white/[0.08] text-white/90";
    bubbleStyle = isRight
      ? {
          background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`,
          boxShadow: `0 6px 20px ${accentColor}35`,
        }
      : {
          background: "rgba(255,255,255,0.06)",
        };
  } else {
    bubbleClass = isRight ? "rounded-br-md border border-white/10 text-white/95" : "rounded-bl-md border border-white/[0.08] text-white/90";
    bubbleStyle = {
      background: "rgba(255,255,255,0.05)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
    };
  }

  return (
    <div className={`flex ${isRight ? "justify-end" : "justify-start"}`}>
      <div
        className={`min-w-0 ${flyers.length > 0 && !suppressFlyers ? "w-full max-w-[min(100%,360px)]" : "max-w-[88%]"} ${rounded} px-3.5 py-2.5 text-[13px] leading-relaxed ${bubbleClass}`}
        style={bubbleStyle}
      >
        {m.content && !callPhone && quickActions.length === 0 && flyers.length === 0 ? (
          <p className="whitespace-pre-wrap">{m.content}</p>
        ) : null}
        {m.content && hasAttachments ? (
          <p className={`whitespace-pre-wrap ${hasAttachments ? "mb-2.5" : ""}`}>{m.content}</p>
        ) : null}
        {callPhone ? (
          <a
            href={`tel:+${getFullPhoneNumber(callPhone)}`}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-black"
            style={{ background: `linear-gradient(145deg, ${accentColor}, ${accentColor}cc)` }}
          >
            Call us
          </a>
        ) : null}
        {quickActions.length > 0 ? (
          <ChatQuickActions actions={quickActions} accentColor={accentColor} onBook={onBook} onMenu={onMenu} />
        ) : null}
        {flyers.length > 0 && !suppressFlyers ? (
          <ChatFlyerCarousel
            items={flyers}
            size={size === "md" ? "md" : "sm"}
            selectable={isFlyersSelectable(m) && Boolean(onSelectFlyer)}
            selectedId={selectedEventId}
            onSelect={onSelectFlyer}
            accentColor={accentColor}
          />
        ) : null}
        {linkButton}
        <p
          className={`mt-1.5 text-[10px] font-medium tracking-wide ${
            isCustomer && isRight ? "text-white/55" : "text-white/30"
          }`}
        >
          {formatChatTime(m.createdAt)}
        </p>
      </div>
    </div>
  );
}
