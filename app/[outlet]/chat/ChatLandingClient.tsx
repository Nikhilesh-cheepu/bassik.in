"use client";

import VenueChatWidget from "@/components/VenueChatWidget";
import type { ChatSessionPayload } from "@/lib/venue-chat-session";

type ChatLandingClientProps = {
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

export default function ChatLandingClient(props: ChatLandingClientProps) {
  return (
    <div className="min-h-[100dvh] bg-[#040408]">
      <VenueChatWidget
        brandId={props.brandId}
        venueShortName={props.venueShortName}
        accentColor={props.accentColor}
        contactPhone={props.contactPhone}
        whatsappMessage={props.whatsappMessage}
        mapUrl={props.mapUrl}
        address={props.address}
        hasMenus={props.hasMenus}
        layout="landing"
        initialSnapshot={props.initialSnapshot}
      />
    </div>
  );
}
