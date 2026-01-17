import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ErrorBoundaryScript from "@/components/ErrorBoundaryScript";
import IOSErrorOverlay from "@/components/IOSErrorOverlay";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bassik Reservations",
  description: "Book your table at any of our venues in one place.",
};

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
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* iOS Error Overlay - only visible if error occurs */
              #ios-error-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.9);
                color: #ffffff;
                z-index: 99999;
                padding: 2rem;
                font-family: system-ui, -apple-system, sans-serif;
                align-items: center;
                justify-content: center;
                flex-direction: column;
              }
            `,
          }}
        />
      </head>
      <body
        className={`${inter.className} antialiased`}
        style={{ margin: 0, padding: 0 }}
      >
        <ErrorBoundaryScript />
        <IOSErrorOverlay />
        {children}
      </body>
    </html>
  );
}

