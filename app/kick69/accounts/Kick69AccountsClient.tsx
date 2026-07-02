"use client";

import { useCallback, useEffect, useState } from "react";
import {
  KICK69_ACCOUNTS_MODULES,
  KICK69_KITCHEN_OUTLETS,
  KICK69_BASSIK_SHARE,
  KICK69_OUTLET_SHARE,
  KICK69_PARTY_PLATE_RATE_INR,
  type Kick69AccountsModule,
} from "@/lib/kick69-accounts";
import Kick69PurchasesView from "./Kick69PurchasesView";

function ModulePlaceholder({ moduleId }: { moduleId: Kick69AccountsModule }) {
  const mod = KICK69_ACCOUNTS_MODULES.find((m) => m.id === moduleId);
  if (moduleId === "sales") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-lg font-semibold text-white">Kitchen & outlet sales</h2>
        <p className="mt-2 text-sm text-white/45">Coming next — wired to your rules:</p>
        <ul className="mt-3 space-y-2 text-sm text-white/55">
          <li>
            Outlets: {KICK69_KITCHEN_OUTLETS.map((o) => o.label).join(" · ")} (one shared kitchen)
          </li>
          <li>
            Split: {Math.round(KICK69_BASSIK_SHARE * 100)}% Bassik · {Math.round(KICK69_OUTLET_SHARE * 100)}% outlet
          </li>
          <li>Party packages: ₹{KICK69_PARTY_PLATE_RATE_INR} per plate (e.g. 20 plates × ₹750)</li>
        </ul>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
      <h2 className="text-lg font-semibold text-white">{mod?.label ?? moduleId}</h2>
      <p className="mt-2 text-sm text-white/40">{mod?.hint}</p>
      <p className="mt-4 text-xs text-white/30">This module is on the roadmap — Purchases is live now.</p>
    </div>
  );
}

export default function Kick69AccountsClient() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [module, setModule] = useState<Kick69AccountsModule>("purchases");

  const checkAuth = useCallback(async () => {
    const res = await fetch("/api/kick69/auth");
    const data = await res.json();
    setAuthed(Boolean(data.authenticated));
  }, []);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch("/api/kick69/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setLoginError("Wrong password");
      return;
    }
    setPassword("");
    setAuthed(true);
  };

  const logout = async () => {
    await fetch("/api/kick69/auth", { method: "DELETE" });
    setAuthed(false);
  };

  if (authed === null) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#06060a] text-white">
        <p className="text-sm text-white/40">Loading…</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#06060a] px-4 text-white">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <h1 className="text-xl font-semibold">KIIK 69 Accounts</h1>
          <p className="mt-1 text-sm text-white/45">Purchases · kitchen · inventory</p>
          <form onSubmit={login} className="mt-5 space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
              autoFocus
            />
            {loginError ? <p className="text-sm text-red-300">{loginError}</p> : null}
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 py-3 text-sm font-semibold"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#06060a] text-white">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06060a]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">KIIK 69 Accounts</h1>
            <p className="text-[11px] text-white/35">Shared kitchen · Bassik ops</p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="shrink-0 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/50"
          >
            Lock
          </button>
        </div>
        <div className="mx-auto max-w-2xl overflow-x-auto px-4 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-1.5">
            {KICK69_ACCOUNTS_MODULES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModule(m.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium ${
                  module === m.id
                    ? "bg-white/12 text-white ring-1 ring-white/15"
                    : "text-white/40 active:bg-white/[0.06]"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4 pb-10">
        {module === "purchases" ? <Kick69PurchasesView /> : <ModulePlaceholder moduleId={module} />}
      </main>
    </div>
  );
}
