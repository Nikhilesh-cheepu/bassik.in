"use client";

import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

function SignInContent() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") || "/";

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 py-8">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl={redirectUrl}
        forceRedirectUrl={redirectUrl}
      />
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white/60" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
