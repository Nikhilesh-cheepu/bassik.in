import { buildGuestGreeting } from "@/lib/venue-chat-copy";
import type { ChatMessageLike } from "@/lib/venue-chat-ui-helpers";

export type BootstrapOffer = {
  id: string;
  imageUrl: string;
  title?: string | null;
  dateLine?: string | null;
};

export function buildOptimisticOnboardingMessages(params: {
  venueName: string;
  hostName?: string | null;
  contactPhone: string;
  whatsappMessage?: string;
  mapUrl?: string | null;
  address?: string;
  hasMenus?: boolean;
  offers?: BootstrapOffer[];
}): ChatMessageLike[] {
  const ts = new Date().toISOString();
  const oid = (n: number) => `opt-${n}`;

  const actions: Record<string, unknown>[] = [
    { id: "call", type: "call", label: "Call us", phone: params.contactPhone },
    {
      id: "whatsapp",
      type: "whatsapp",
      label: "WhatsApp",
      phone: params.contactPhone,
      message: params.whatsappMessage ?? "Hi!",
    },
  ];
  if (params.mapUrl) {
    actions.push({
      id: "directions",
      type: "directions",
      label: "Directions",
      url: params.mapUrl,
      address: params.address ?? "",
    });
  }
  if (params.hasMenus) {
    actions.push({ id: "menu", type: "menu", label: "View menu" });
  }
  actions.push(
    { id: "pricing", type: "pricing", label: "Pricing & offers" },
    { id: "website", type: "website", label: "Explore website" },
    { id: "book", type: "book", label: "Book a table" }
  );

  const msgs: ChatMessageLike[] = [
    {
      id: oid(1),
      role: "ASSISTANT",
      content: buildGuestGreeting(params.venueName, params.hostName),
      imageUrl: null,
      metadata: { type: "welcome_greeting" },
      createdAt: ts,
    },
    {
      id: oid(2),
      role: "ASSISTANT",
      content: "",
      imageUrl: null,
      metadata: { type: "quick_actions", actions },
      createdAt: ts,
    },
  ];

  const offers = params.offers ?? [];
  if (offers.length === 0) {
    msgs.push({
      id: oid(3),
      role: "ASSISTANT",
      content:
        "New events are coming soon — tell me which night you're planning and we'll sort your table.",
      imageUrl: null,
      metadata: null,
      createdAt: ts,
    });
  } else {
    msgs.push({
      id: oid(3),
      role: "ASSISTANT",
      content: "Book any event here — tap one to reserve your spot.",
      imageUrl: null,
      metadata: {
        type: "flyers",
        items: offers.slice(0, 8).map((o) => ({
          id: o.id,
          imageUrl: o.imageUrl,
          title: o.title,
          dateLine: o.dateLine,
        })),
        selectable: true,
      },
      createdAt: ts,
    });
  }

  return msgs;
}

export function isOptimisticMessageId(id: string): boolean {
  return id.startsWith("opt-") || id.startsWith("tmp-");
}
