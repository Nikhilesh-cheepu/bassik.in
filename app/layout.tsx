import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bassik Reservations",
  description: "Book your table at any of our venues in one place.",
  icons: {
    icon: "/logos/bassik.png",
    shortcut: "/logos/bassik.png",
    apple: "/logos/bassik.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logos/bassik.png" />
      </head>
      <body
        className={`${inter.className} antialiased overflow-x-hidden`}
        style={{ margin: 0, padding: 0 }}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}

