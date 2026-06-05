export type FlyerItem = {
  id: string;
  imageUrl: string;
  label?: string;
};

export type ChatMessageLike = {
  id: string;
  role: string;
  content: string;
  imageUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export function flyersForMessage(m: ChatMessageLike): FlyerItem[] {
  const meta = m.metadata;
  if (meta?.type === "flyers" && Array.isArray(meta.items)) {
    const items: FlyerItem[] = [];
    for (const raw of meta.items) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as {
        id?: string;
        imageUrl?: string;
        title?: string | null;
        dateLine?: string | null;
      };
      if (!item.imageUrl) continue;
      const label = [item.title?.trim(), item.dateLine?.trim()].filter(Boolean).join(" · ");
      items.push({
        id: item.id ?? m.id,
        imageUrl: item.imageUrl,
        label: label || undefined,
      });
    }
    return items;
  }
  if (m.imageUrl) {
    return [
      {
        id: m.id,
        imageUrl: m.imageUrl,
        label: m.content.split("\n")[0]?.trim() || undefined,
      },
    ];
  }
  return [];
}

export function splitGuestOnboarding(messages: ChatMessageLike[]) {
  const onboardingIds = new Set<string>();
  let greetingText = "";
  let quickActionsMessage: ChatMessageLike | null = null;
  let eventsMessage: ChatMessageLike | null = null;
  let eventsFallbackText: string | null = null;

  for (const m of messages) {
    if (m.role !== "ASSISTANT" && m.role !== "SYSTEM") break;

    if (m.metadata?.type === "quick_actions") {
      quickActionsMessage = m;
      onboardingIds.add(m.id);
      continue;
    }
    if (m.metadata?.type === "flyers") {
      eventsMessage = m;
      onboardingIds.add(m.id);
      continue;
    }
    if (m.metadata?.type === "welcome_greeting" || /^Dear Guest/i.test(m.content.trim())) {
      greetingText = m.content;
      onboardingIds.add(m.id);
      continue;
    }
    if (
      /events are coming soon|New events are coming/i.test(m.content) &&
      !m.metadata
    ) {
      eventsFallbackText = m.content;
      onboardingIds.add(m.id);
      continue;
    }
    if (
      /Which night are you thinking|Even a rough plan helps/i.test(m.content) &&
      !m.metadata
    ) {
      onboardingIds.add(m.id);
      continue;
    }
    break;
  }

  const conversation = messages.filter((m) => !onboardingIds.has(m.id));
  return {
    greetingText,
    quickActionsMessage,
    eventsMessage,
    eventsFallbackText,
    conversation,
    hasOnboarding: onboardingIds.size > 0,
  };
}

export function isPosterOnlyMessage(_m: ChatMessageLike): boolean {
  return false;
}

/** All unique flyers across a thread (metadata carousel + legacy imageUrl messages). */
export function extractAllFlyers(messages: ChatMessageLike[]): FlyerItem[] {
  const items: FlyerItem[] = [];
  const seen = new Set<string>();
  for (const m of messages) {
    for (const f of flyersForMessage(m)) {
      if (seen.has(f.imageUrl)) continue;
      seen.add(f.imageUrl);
      items.push(f);
    }
  }
  return items;
}

export function messageHasFlyerCarousel(m: ChatMessageLike): boolean {
  return m.metadata?.type === "flyers" && Array.isArray(m.metadata.items);
}

export function formatChatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatListTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleString("en-IN", { day: "numeric", month: "short" });
}

export function displayPhone(phone: string): string {
  const d = phone.replace(/\D/g, "").slice(-10);
  if (d.length !== 10) return phone;
  return `${d.slice(0, 5)} ${d.slice(5)}`;
}

/** guest = customer on right. manager = customer on left, you/AI on right. */
export type ChatPerspective = "guest" | "manager";

export function bubbleSide(role: string, perspective: ChatPerspective): "left" | "right" {
  const isCustomer = role === "USER";
  if (role === "SYSTEM") return "left";
  if (perspective === "guest") return isCustomer ? "right" : "left";
  return isCustomer ? "left" : "right";
}

export function isCustomerRole(role: string): boolean {
  return role === "USER";
}

export function isHostRole(role: string): boolean {
  return role === "ASSISTANT" || role === "MANAGER";
}
