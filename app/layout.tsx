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
      <body className={`${inter.className} bg-gradient-to-b from-[#050509] via-[#050509] to-[#020207]`}>
        {/* Background glow */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#facc15]/5 blur-3xl" />
          <div className="absolute bottom-0 right-10 h-72 w-72 rounded-full bg-[#22c55e]/5 blur-3xl" />
        </div>
        {children}
      </body>
    </html>
  );
}

