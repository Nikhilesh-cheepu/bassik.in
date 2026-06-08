"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type PhoneOtpSheetProps = {
  open: boolean;
  phone: string;
  name?: string;
  leadId?: string | null;
  accentColor?: string;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onVerified: (guest: { phone: string; name: string | null }) => void;
};

export default function PhoneOtpSheet({
  open,
  phone,
  name,
  leadId,
  accentColor = "#22d3ee",
  title = "Verify your mobile",
  subtitle = "We'll send a 6-digit code — quick and secure.",
  onClose,
  onVerified,
}: PhoneOtpSheetProps) {
  const [step, setStep] = useState<"send" | "otp">("send");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("send");
    setOtp("");
    setError(null);
    setResendIn(0);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    if (step === "otp") otpRef.current?.focus();
  }, [step]);

  const sendOtp = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send code");
      setStep("otp");
      setResendIn(30);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, name, leadId: leadId ?? undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Verification failed");
      onVerified(data.guest ?? { phone, name: name ?? null });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (resendIn > 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/otp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not resend");
      setResendIn(30);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resend");
    } finally {
      setBusy(false);
    }
  };

  const masked = phone.length === 10 ? `${phone.slice(0, 2)}******${phone.slice(-2)}` : phone;

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-[130] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            className="fixed inset-x-0 bottom-0 z-[131] mx-auto max-w-md rounded-t-3xl border border-white/10 bg-[#0a0a0f] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <p className="mt-1 text-sm text-white/55">{subtitle}</p>
            <p className="mt-2 text-sm font-medium text-white/80">+91 {masked}</p>

            {step === "send" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void sendOtp()}
                className="mt-5 w-full rounded-xl py-3.5 text-sm font-bold text-black disabled:opacity-50"
                style={{ backgroundColor: accentColor }}
              >
                {busy ? "Sending…" : "Send OTP"}
              </button>
            ) : (
              <div className="mt-5 space-y-3">
                <input
                  ref={otpRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center text-xl tracking-[0.35em] text-white outline-none focus:border-white/30"
                />
                <button
                  type="button"
                  disabled={busy || otp.length !== 6}
                  onClick={() => void verifyOtp()}
                  className="w-full rounded-xl py-3.5 text-sm font-bold text-black disabled:opacity-50"
                  style={{ backgroundColor: accentColor }}
                >
                  {busy ? "Verifying…" : "Verify & continue"}
                </button>
                <button
                  type="button"
                  disabled={busy || resendIn > 0}
                  onClick={() => void resend()}
                  className="w-full text-sm text-white/45 disabled:opacity-40"
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                </button>
              </div>
            )}

            {error ? (
              <p className="mt-3 text-center text-xs text-red-400">{error}</p>
            ) : null}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
