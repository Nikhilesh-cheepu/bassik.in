"use client";

import { ClerkProvider } from "@clerk/nextjs";

/**
 * Keep Clerk context available for all client hooks/components at all times.
 * Rendering children without ClerkProvider causes useUser/useAuth crashes.
 */
export default function ClerkProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
