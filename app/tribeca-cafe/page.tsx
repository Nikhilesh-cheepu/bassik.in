import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import TribecaCafeClient from "./TribecaCafeClient";

export const metadata: Metadata = {
  title: "Tribeca Cafe | Bassik",
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  themeColor: "#0b0c10",
};

export default function TribecaCafePage() {
  return (
    <Suspense fallback={<div className="proposal-doc min-h-[100dvh]" />}>
      <TribecaCafeClient />
    </Suspense>
  );
}
