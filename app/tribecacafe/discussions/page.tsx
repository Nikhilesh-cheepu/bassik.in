import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import TribecaDiscussionsClient from "./TribecaDiscussionsClient";

export const metadata: Metadata = {
  title: "Discussion | Tribeca Cafe",
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  themeColor: "#0b0c10",
};

export default function TribecaDiscussionsPage() {
  return (
    <Suspense fallback={<div className="proposal-doc min-h-[100dvh]" />}>
      <TribecaDiscussionsClient />
    </Suspense>
  );
}
