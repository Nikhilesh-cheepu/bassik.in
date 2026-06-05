import { getWhatsAppMessageForBrand, getContactForBrand } from "@/lib/outlet-contacts";
import { BRANDS } from "@/lib/brands";
import { buildBookingLinkMetadata } from "@/lib/venue-chat-booking-link";
import { friendlyEventLabel, sanitizeGuestName } from "@/lib/venue-chat-guest";
import { bookingPath } from "@/lib/venue-chat-paths";
import type { ManagerShortcutId } from "@/lib/leads-manager-shortcuts";

export type ManagerShortcutPayload = {
  content: string;
  metadata: Record<string, unknown>;
};

export type ManagerShortcutLead = {
  brandId: string;
  guestName: string | null;
  selectedEventId: string | null;
  selectedEventName: string | null;
  contactNumber?: string | null;
  mapUrl?: string | null;
};

export function buildManagerShortcut(
  shortcut: ManagerShortcutId,
  lead: ManagerShortcutLead
): ManagerShortcutPayload | null {
  const name = sanitizeGuestName(lead.guestName);
  const greet = name ? `${name}, ` : "";
  const brand = BRANDS.find((b) => b.id === lead.brandId);

  switch (shortcut) {
    case "book_table": {
      const url = bookingPath(lead.brandId);
      return {
        content: `${greet}whenever you're ready — tap below to pick your date and reserve your table.`,
        metadata: {
          sentBy: "manager",
          ...buildBookingLinkMetadata(url, "Reserve your table →", "table"),
        },
      };
    }
    case "book_event": {
      if (!lead.selectedEventId) return null;
      const url = bookingPath(lead.brandId, lead.selectedEventId);
      const event = friendlyEventLabel(lead.selectedEventName);
      return {
        content: `${greet}you're all set for ${event} — tap below to complete your booking.`,
        metadata: {
          sentBy: "manager",
          ...buildBookingLinkMetadata(url, "Book this night →", "event", lead.selectedEventId),
        },
      };
    }
    case "menu_page": {
      const url = `/${lead.brandId}#menu`;
      return {
        content: `${greet}here's our menu — take a look and tell me what you're in the mood for.`,
        metadata: {
          sentBy: "manager",
          type: "external_link",
          url,
          label: "View menu →",
        },
      };
    }
    case "directions": {
      const url = lead.mapUrl?.trim() || `/${lead.brandId}`;
      return {
        content: `${greet}here are directions to ${brand?.shortName ?? "us"} — see you soon!`,
        metadata: {
          sentBy: "manager",
          type: "external_link",
          url,
          label: "Get directions →",
        },
      };
    }
    case "whatsapp": {
      const venuePhone = getContactForBrand(lead.brandId).replace(/\D/g, "").slice(-10);
      if (!venuePhone) return null;
      const text = encodeURIComponent(getWhatsAppMessageForBrand(lead.brandId, brand?.shortName ?? "us"));
      const url = `https://wa.me/91${venuePhone}?text=${text}`;
      return {
        content: `${greet}feel free to ping us on WhatsApp anytime — we're here to help.`,
        metadata: {
          sentBy: "manager",
          type: "external_link",
          url,
          label: "WhatsApp us →",
        },
      };
    }
    case "venue_page": {
      const url = `/${lead.brandId}`;
      return {
        content: `${greet}here's our venue page — menus, events and more whenever you need.`,
        metadata: {
          sentBy: "manager",
          type: "external_link",
          url,
          label: "View venue →",
        },
      };
    }
    case "follow_up":
      return {
        content: `Hi${name ? ` ${name}` : ""}! Just checking in — can I help with your table or tonight's plan?`,
        metadata: { sentBy: "manager" },
      };
    case "thanks":
      return {
        content: `Thank you${name ? `, ${name}` : ""}! We're looking forward to hosting you. Reach out anytime.`,
        metadata: { sentBy: "manager" },
      };
    default:
      return null;
  }
}

export function shortcutDraftLabel(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  if (metadata.type === "booking_link" && typeof metadata.label === "string") {
    return metadata.label.replace(/\s*→\s*$/, "");
  }
  if (metadata.type === "external_link" && typeof metadata.label === "string") {
    return metadata.label.replace(/\s*→\s*$/, "");
  }
  return null;
}
