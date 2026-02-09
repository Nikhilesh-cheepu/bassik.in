"use client";

import dynamic from "next/dynamic";

const VenuesPageClient = dynamic(() => import("./VenuesPageClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  ),
});

export default function VenuesPage() {
  return <VenuesPageClient />;
}
