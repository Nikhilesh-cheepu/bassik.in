import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bassik Reservations",
  description: "Book your table at any of our venues in one place.",
};

// Prevent mobile zoom on input focus and ensure proper scaling
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#050509]`}>
        {/* Background glow - subtle and non-distracting */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#d4af37]/3 blur-3xl" />
          <div className="absolute bottom-0 right-10 h-72 w-72 rounded-full bg-[#4FD1C5]/3 blur-3xl" />
        </div>
        {children}
      </body>
    </html>
  );
}

