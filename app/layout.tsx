import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import RouteProgressBar from "@/components/RouteProgressBar";
import { SiteFooter } from "@/components/agency/SiteFooter";
import { AGENCY_SEO } from "@/lib/bassik-agency";
import { isPublicVenueBookingLive } from "@/lib/site-mode";

const agencyDisplay = Syne({
  subsets: ["latin"],
  variable: "--font-agency-display",
  weight: ["500", "600", "700"],
});

const agencyBody = DM_Sans({
  subsets: ["latin"],
  variable: "--font-agency-body",
  weight: ["400", "500", "600", "700"],
});

const bookingLive = isPublicVenueBookingLive();

export const metadata: Metadata = bookingLive
  ? {
      title: "Bassik Reservations",
      description: "Book your table at any of our venues in one place.",
      icons: {
        icon: "/logos/bassik.png",
        shortcut: "/logos/bassik.png",
        apple: "/logos/bassik.png",
      },
    }
  : {
      title: {
        default: AGENCY_SEO.title,
        template: "%s | Bassik",
      },
      description: AGENCY_SEO.description,
      keywords: [...AGENCY_SEO.keywords],
      applicationName: "Bassik",
      icons: {
        icon: "/logos/bassik.png",
        shortcut: "/logos/bassik.png",
        apple: "/logos/bassik.png",
      },
      openGraph: {
        type: "website",
        siteName: "Bassik",
        title: AGENCY_SEO.title,
        description: AGENCY_SEO.description,
      },
      twitter: {
        card: "summary_large_image",
        title: AGENCY_SEO.title,
        description: AGENCY_SEO.description,
      },
      robots: { index: true, follow: true },
    };

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${agencyDisplay.variable} ${agencyBody.variable}`}>
      <head>
        <link rel="icon" href="/logos/bassik.png" />
      </head>
      <body
        className={`${agencyBody.className} antialiased overflow-x-hidden`}
        style={{ margin: 0, padding: 0 }}
      >
        <RouteProgressBar />
        {children}
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
