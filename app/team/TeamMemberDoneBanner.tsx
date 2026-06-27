"use client";

import { IconWhatsApp } from "./TeamIcons";

export default function TeamMemberDoneBanner({
  count,
  todayCount,
  onSend,
}: {
  count: number;
  todayCount: number;
  onSend: () => void;
}) {
  if (count === 0) return null;

  const headline =
    todayCount > 0
      ? `${todayCount} finished today — time to send your update`
      : `${count} done task${count === 1 ? "" : "s"} ready to share`;

  return (
    <aside className="mb-4 overflow-hidden rounded-2xl border border-emerald-500/35 bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-transparent p-4 shadow-[0_8px_32px_-12px_rgba(16,185,129,0.35)] ring-1 ring-emerald-400/15">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/25 ring-1 ring-emerald-400/30">
          <IconWhatsApp className="h-6 w-6 text-emerald-200" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[15px] font-semibold leading-snug text-emerald-50">{headline}</p>
          <p className="mt-1 text-xs leading-relaxed text-white/55">
            Send your done list on WhatsApp so the team knows what you&apos;ve completed. Quick and
            easy — just tap below.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onSend}
        className="mt-4 flex w-full min-h-[54px] items-center justify-center gap-2.5 rounded-xl bg-emerald-600 text-[15px] font-semibold text-white shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-500 active:scale-[0.99]"
      >
        <IconWhatsApp className="h-5 w-5" />
        Send done list on WhatsApp
      </button>
    </aside>
  );
}
