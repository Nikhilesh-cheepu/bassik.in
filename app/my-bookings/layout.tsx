import type { Metadata } from "next";
import { isPublicVenueBookingLive } from "@/lib/site-mode";

export async function generateMetadata(): Promise<Metadata> {
  const live = isPublicVenueBookingLive();
  return {
    title: "My bookings",
    robots: live ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default function MyBookingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
