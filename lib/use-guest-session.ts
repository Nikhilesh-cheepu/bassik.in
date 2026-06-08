"use client";

import { useCallback, useEffect, useState } from "react";

export type GuestProfile = {
  phone: string;
  name: string | null;
  verified: boolean;
};

export function useGuestSession() {
  const [guest, setGuest] = useState<GuestProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/guest", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setGuest(data.guest ?? null);
    } catch {
      setGuest(null);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isVerifiedPhone = useCallback(
    (phone10: string) => guest?.verified === true && guest.phone === phone10.replace(/\D/g, "").slice(-10),
    [guest]
  );

  return { guest, loaded, refresh, isVerifiedPhone, setGuest };
}
