"use client";

import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

function SignUpContent() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") || "/";

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 py-8">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl={redirectUrl}
        forceRedirectUrl={redirectUrl}
      />
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white/60" />
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}
