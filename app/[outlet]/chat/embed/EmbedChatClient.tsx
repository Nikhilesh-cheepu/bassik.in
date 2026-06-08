"use client";

import VenueChatWidget from "@/components/VenueChatWidget";
import type { ChatSessionPayload } from "@/lib/venue-chat-session";

type EmbedChatClientProps = {
  brandId: string;
  venueShortName: string;
  accentColor: string;
  contactPhone: string;
  whatsappMessage: string;
  mapUrl: string | null;
  address: string;
  hasMenus: boolean;
  initialSnapshot: ChatSessionPayload;
};

export default function EmbedChatClient(props: EmbedChatClientProps) {
  return (
    <div className="min-h-[100dvh] overflow-hidden rounded-t-[18px] bg-[#040408]">
      <VenueChatWidget
        brandId={props.brandId}
        venueShortName={props.venueShortName}
        accentColor={props.accentColor}
        contactPhone={props.contactPhone}
        whatsappMessage={props.whatsappMessage}
        mapUrl={props.mapUrl}
        address={props.address}
        hasMenus={props.hasMenus}
        layout="embed"
        initialSnapshot={props.initialSnapshot}
      />
    </div>
  );
}
