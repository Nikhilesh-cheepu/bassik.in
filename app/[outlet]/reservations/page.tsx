"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ReservationsRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const outletSlug = params?.outlet as string;

  useEffect(() => {
    if (outletSlug) router.replace(`/${outletSlug}/book`);
  }, [outletSlug, router]);

  return null;
}
