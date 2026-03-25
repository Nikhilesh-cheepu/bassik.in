"use client";

type HomeConciergeProps = {
  onShuffle: () => void;
};

export default function HomeConcierge({ onShuffle }: HomeConciergeProps) {
  return (
    <section
      id="home-concierge"
      className="px-5 sm:px-6 mb-11 sm:mb-14 scroll-mt-20"
      aria-label="Refresh your picks"
    >
      <div
        className="max-w-sm mx-auto text-center rounded-[1.75rem] px-7 py-9 sm:py-10
          bg-gradient-to-b from-amber-950/40 via-stone-950/50 to-black/80
          border border-amber-500/15
          shadow-[0_20px_50px_-20px_rgba(251,191,36,0.18),0_0_0_1px_rgba(255,255,255,0.04)_inset]"
      >
        <p className="text-base sm:text-lg font-medium text-stone-100 leading-snug tracking-tight">
          Let’s find you something good.
        </p>
        <p className="text-xs sm:text-sm text-stone-400 mt-3 mb-7 leading-relaxed">
          One tap — we refresh what shows up first. You choose where the night goes.
        </p>
        <button
          type="button"
          onClick={onShuffle}
          className="w-full max-w-[16rem] mx-auto inline-flex items-center justify-center rounded-2xl px-6 py-3.5 text-sm font-semibold
            text-stone-900 bg-gradient-to-b from-amber-200 to-amber-400/95
            hover:from-amber-100 hover:to-amber-300 active:scale-[0.98] transition-all
            shadow-[0_8px_24px_-6px_rgba(251,191,36,0.45),0_2px_8px_-2px_rgba(0,0,0,0.4)]"
        >
          Pick for me
        </button>
      </div>
    </section>
  );
}
