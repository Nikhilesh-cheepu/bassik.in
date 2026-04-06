"use client";

import dynamic from "next/dynamic";

const VenuesPageClient = dynamic(() => import("../VenuesPageClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
        <p className="mt-3 text-sm text-slate-600">Loading venues…</p>
      </div>
    </div>
  ),
});

/** Card grid of all outlets — bookmark this path if you need the overview. */
export default function VenuesOverviewPage() {
  return <VenuesPageClient mode="overview" />;
}
