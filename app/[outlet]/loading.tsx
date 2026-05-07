export default function OutletLoading() {
  return (
    <div className="min-h-screen bg-black w-full">
      <div className="w-full max-w-full border-b border-white/10 bg-black/50 pt-2 pb-3">
        <div
          className="mx-auto max-w-[400px] w-[78vw] animate-pulse rounded-[20px] bg-white/10"
          style={{ aspectRatio: "9 / 16", maxHeight: "54vh" }}
        />
      </div>
      <div className="mx-auto max-w-md px-4 pt-6 space-y-3">
        <div className="h-4 w-3/4 rounded bg-white/10 animate-pulse" />
        <div className="h-4 w-1/2 rounded bg-white/10 animate-pulse" />
        <div className="mt-4 h-[260px] rounded-2xl bg-white/[0.04] animate-pulse" />
      </div>
      <div
        className="fixed left-1/2 z-[100] w-[calc(100%-1rem)] max-w-md -translate-x-1/2"
        style={{ bottom: "max(0.6rem, env(safe-area-inset-bottom))" }}
      >
        <div className="rounded-full border border-white/12 bg-black/95 p-1 shadow-[0_10px_36px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          <div className="flex min-h-[42px] items-stretch gap-1">
            <div className="min-h-[40px] flex-[1.35] rounded-full bg-white/[0.06] animate-pulse" />
            <div className="min-h-[40px] flex-1 rounded-full bg-white/[0.06] animate-pulse" />
            <div className="min-h-[40px] flex-1 rounded-full bg-white/[0.06] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
