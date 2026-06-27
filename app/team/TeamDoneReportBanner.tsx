"use client";

import { IconWhatsApp } from "./TeamIcons";

export default function TeamDoneReportBanner({
  count,
  dateCount,
  onSend,
  isMember,
}: {
  count: number;
  dateCount: number;
  onSend: () => void;
  isMember: boolean;
}) {
  if (count === 0) return null;

  const headline = isMember
    ? `Send your done report (${count} task${count === 1 ? "" : "s"})`
    : `Send done report — ${count} task${count === 1 ? "" : "s"} across ${dateCount} date${dateCount === 1 ? "" : "s"}`;

  return (
    <aside className="mb-4 overflow-hidden rounded-2xl border border-emerald-500/35 bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-transparent p-4 shadow-[0_8px_32px_-12px_rgba(16,185,129,0.35)] ring-1 ring-emerald-400/15">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/25 ring-1 ring-emerald-400/30">
          <IconWhatsApp className="h-6 w-6 text-emerald-200" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[15px] font-semibold leading-snug text-emerald-50">{headline}</p>
          <p className="mt-1 text-xs leading-relaxed text-white/55">
            Pick which dates to include — we&apos;ll build a custom WhatsApp message for those
            completed tasks.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onSend}
        className="mt-4 flex w-full min-h-[54px] items-center justify-center gap-2.5 rounded-xl bg-emerald-600 text-[15px] font-semibold text-white shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-500 active:scale-[0.99]"
      >
        <IconWhatsApp className="h-5 w-5" />
        Send done report on WhatsApp
      </button>
    </aside>
  );
}
