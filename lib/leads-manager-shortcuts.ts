/** Client-safe manager shortcut definitions (no server/DB imports). */

export type ManagerShortcutId =
  | "book_table"
  | "book_event"
  | "venue_page"
  | "menu_page"
  | "directions"
  | "whatsapp"
  | "follow_up"
  | "thanks";

export type ManagerShortcut = {
  id: ManagerShortcutId;
  label: string;
  description: string;
};

export const MANAGER_SHORTCUTS: ManagerShortcut[] = [
  { id: "book_table", label: "Table link", description: "Full booking page" },
  { id: "book_event", label: "Event link", description: "Guest's picked event" },
  { id: "menu_page", label: "Menu", description: "Venue page — menus" },
  { id: "directions", label: "Directions", description: "Google Maps link" },
  { id: "whatsapp", label: "WhatsApp", description: "Chat on WhatsApp" },
  { id: "venue_page", label: "Venue page", description: "Outlet homepage" },
  { id: "follow_up", label: "Follow up", description: "Soft check-in" },
  { id: "thanks", label: "Thank you", description: "Warm closing note" },
];
