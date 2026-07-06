"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  lockViewportForPayment,
  resetIosInputZoom,
  unlockViewportForPayment,
} from "@/lib/reset-mobile-zoom";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Razorpay"));
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export type RazorpayCheckoutInput = {
  keyId: string;
  orderId: string;
  amountPaise: number;
  name: string;
  description: string;
  prefill?: { name?: string; contact?: string };
};

export function useRazorpayCheckout() {
  const [loading, setLoading] = useState(false);
  const busyRef = useRef(false);

  const openCheckout = useCallback(
    async (
      input: RazorpayCheckoutInput,
      onSuccess: (payload: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => Promise<void>
    ) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setLoading(true);
      try {
        await loadRazorpayScript();
        if (!window.Razorpay) throw new Error("Razorpay unavailable");

        // iOS: Razorpay modal misaligns if body was pinned for another overlay.
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";

        resetIosInputZoom();
        lockViewportForPayment();
        await new Promise<void>((r) => window.setTimeout(r, 120));

        try {
          await new Promise<void>((resolve, reject) => {
            let settled = false;
            const finish = (fn: () => void) => {
              if (settled) return;
              settled = true;
              unlockViewportForPayment();
              fn();
            };

            const rzp = new window.Razorpay!({
              key: input.keyId,
              amount: input.amountPaise,
              currency: "INR",
              name: input.name,
              description: input.description,
              order_id: input.orderId,
              prefill: input.prefill,
              theme: { color: "#F97316" },
              handler: async (response: {
                razorpay_order_id: string;
                razorpay_payment_id: string;
                razorpay_signature: string;
              }) => {
                try {
                  await onSuccess(response);
                  finish(resolve);
                } catch (e) {
                  finish(() => reject(e));
                }
              },
              modal: {
                ondismiss: () => {
                  finish(() => reject(new Error("Payment cancelled")));
                },
              },
            });
            rzp.open();
          });
        } catch (e) {
          unlockViewportForPayment();
          throw e;
        }
      } finally {
        unlockViewportForPayment();
        busyRef.current = false;
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadRazorpayScript().catch(() => null);
  }, []);

  return { openCheckout, loading };
}
