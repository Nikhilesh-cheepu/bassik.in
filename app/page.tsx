"use client";

import { Suspense } from "react";
import HomeTrail from "@/components/HomeTrail";

function LandingContent() {
  return <HomeTrail />;
}

export default function LandingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <LandingContent />
    </Suspense>
  );
}
