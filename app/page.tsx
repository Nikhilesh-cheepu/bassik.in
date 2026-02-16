"use client";

import dynamic from "next/dynamic";

const HomeTrail = dynamic(() => import("@/components/HomeTrail"), {
  ssr: true,
  loading: () => (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto" />
        <p className="mt-4 text-gray-400">Loading...</p>
      </div>
    </div>
  ),
});

export default function LandingPage() {
  return <HomeTrail />;
}
