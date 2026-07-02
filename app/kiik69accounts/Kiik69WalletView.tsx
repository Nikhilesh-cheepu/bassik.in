"use client";

import { useCallback, useEffect, useState } from "react";
import { TeamDatePicker } from "@/app/team/TeamDatePicker";
import { formatKiik69Timestamp } from "@/lib/kiik69-datetime";
import type { Kiik69WalletSummary } from "@/lib/kiik69-wallet";
import { formatInr as formatWalletInr } from "@/lib/kiik69-wallet";
import {
  KIIK69_BTN,
  KIIK69_INPUT,
  KIIK69_SHEET_OVERLAY,
  KIIK69_SHEET_PANEL_SCROLL,
  Kiik69SheetPortal,
  kiik69FilterChip,
  useKiik69BodyScrollLock,
} from "./Kiik69Nav";

const todayKey = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export default function Kiik69WalletView({ addSignal = 0 }: { addSignal?: number }) {
  const [wallet, setWallet] = useState<Kiik69WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/kiik69accounts/wallet");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load wallet");
      setWallet(data.wallet as Kiik69WalletSummary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (addSignal > 0) setShowForm(true);
  }, [addSignal]);

  useKiik69BodyScrollLock(showForm);

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.03]" />
          ))}
        </div>
      ) : wallet ? (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-xl bg-[#0e0e14] px-4 py-3 ring-1 ring-emerald-500/20">
              <p className="text-[10px] uppercase tracking-wide text-white/35">Available</p>
              <p className="mt-1 text-xl font-semibold text-emerald-300/90">{formatWalletInr(wallet.balanceInr)}</p>
            </div>
            <div className="rounded-xl bg-[#0e0e14] px-4 py-3 ring-1 ring-white/[0.06]">
              <p className="text-[10px] uppercase tracking-wide text-white/35">Deposited</p>
              <p className="mt-1 text-lg font-semibold text-white/90">{formatWalletInr(wallet.totalDeposits)}</p>
            </div>
            <div className="rounded-xl bg-[#0e0e14] px-4 py-3 ring-1 ring-white/[0.06]">
              <p className="text-[10px] uppercase tracking-wide text-white/35">Spent</p>
              <p className="mt-1 text-lg font-semibold text-white/90">{formatWalletInr(wallet.totalSpends)}</p>
            </div>
          </div>
          <p className="text-[11px] text-white/35">KIIK 69 petty cash — separate from food & liquor stock.</p>

          {wallet.entries.length === 0 ? (
            <p className="py-12 text-center text-sm text-white/40">No entries yet — deposit cash to start.</p>
          ) : (
            <ul className="space-y-2">
              {wallet.entries.map((e) => (
                <li key={e.id} className="rounded-xl bg-[#0e0e14] px-3.5 py-3 ring-1 ring-white/[0.06]">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-white/85">
                        {e.type === "deposit" ? "Deposit" : "Spend"}
                        {e.note ? ` · ${e.note}` : ""}
                      </p>
                      <p className="text-[10px] text-white/30 tabular-nums">
                        {formatKiik69Timestamp(e.createdAt, e.entryDate)}
                      </p>
                    </div>
                    <p className={`text-sm font-semibold ${e.type === "deposit" ? "text-emerald-300" : "text-orange-300"}`}>
                      {e.type === "deposit" ? "+" : "−"}
                      {formatWalletInr(e.amountInr)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}

      <div className="hidden pt-2 pb-1 xl:block">
        <button type="button" onClick={() => setShowForm(true)} className={`${KIIK69_BTN} min-h-[48px] w-full xl:max-w-xs`}>
          + Deposit or spend
        </button>
      </div>

      {showForm ? (
        <WalletFormSheet onClose={() => setShowForm(false)} onSaved={load} />
      ) : null}
    </div>
  );
}

function WalletFormSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<"deposit" | "spend">("deposit");
  const [amountInr, setAmountInr] = useState("");
  const [entryDate, setEntryDate] = useState(todayKey());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/kiik69accounts/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, amountInr: Number(amountInr), entryDate, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Kiik69SheetPortal>
      <div className={KIIK69_SHEET_OVERLAY} onClick={onClose} role="presentation">
        <div
          className={`${KIIK69_SHEET_PANEL_SCROLL} max-w-md`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20 md:hidden" />
        <h2 className="text-lg font-semibold">KIIK 69 wallet</h2>
        <div className="mt-4 flex gap-2">
          {(["deposit", "spend"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} className={kiik69FilterChip(type === t)}>
              {t === "deposit" ? "Deposit" : "Spend"}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs text-white/45">Amount (₹)</span>
            <input className={`${KIIK69_INPUT} mt-1`} inputMode="decimal" value={amountInr} onChange={(e) => setAmountInr(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs text-white/45">Date</span>
            <div className="mt-1">
              <TeamDatePicker value={entryDate} onChange={setEntryDate} compact />
            </div>
          </label>
          <label className="block">
            <span className="text-xs text-white/45">Note</span>
            <input className={`${KIIK69_INPUT} mt-1`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Morning float" />
          </label>
        </div>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="min-h-[48px] flex-1 rounded-xl border border-white/10 text-sm text-white/60">Cancel</button>
          <button type="button" disabled={saving || !amountInr.trim()} onClick={() => void save()} className={`${KIIK69_BTN} min-h-[48px] flex-1`}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        </div>
      </div>
    </Kiik69SheetPortal>
  );
}
