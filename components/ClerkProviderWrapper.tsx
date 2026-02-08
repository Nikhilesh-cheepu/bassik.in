"use client";

import { useState, useEffect } from "react";
import { ClerkProvider } from "@clerk/nextjs";

/**
 * Wrap children in ClerkProvider only on the client. On the server (and during
 * Vercel serverless SSR), we render children without the provider to avoid
 * "Cannot read properties of null (reading 'useContext')" when Clerk internals
 * run in an environment where their context is not set up.
 */
export default function ClerkProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <>{children}</>;
  }
  return <ClerkProvider>{children}</ClerkProvider>;
}
