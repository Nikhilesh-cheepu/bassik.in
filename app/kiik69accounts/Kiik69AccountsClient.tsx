"use client";

import Image from "next/image";
import { useState } from "react";
import {
  KIIK69_ACCOUNTS_MODULES,
  KIIK69_KITCHEN_OUTLETS,
  KIIK69_BASSIK_SHARE,
  KIIK69_OUTLET_SHARE,
  KIIK69_PARTY_PLATE_RATE_INR,
  type Kiik69AccountsModule,
} from "@/lib/kiik69-accounts";
import Kiik69PurchasesView from "./Kiik69PurchasesView";
import Kiik69AiPanel from "./Kiik69AiPanel";
import Kiik69Dock, {
  KIIK69_DOCK_PADDING,
  KIIK69_PAGE,
  Kiik69MoreSheet,
  Kiik69SidebarNav,
} from "./Kiik69Nav";

const LOGO = "/logos/kiik69.png";

function ComingSoon({ moduleId }: { moduleId: Kiik69AccountsModule }) {
  const mod = KIIK69_ACCOUNTS_MODULES.find((m) => m.id === moduleId);
  if (moduleId === "sales") {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
        <h2 className="text-lg font-semibold text-white">Kitchen & outlet sales</h2>
        <p className="mt-2 text-sm text-white/45">Coming soon</p>
        <ul className="mt-3 space-y-2 text-sm text-white/55">
          <li>Outlets: {KIIK69_KITCHEN_OUTLETS.map((o) => o.label).join(", ")}</li>
          <li>
            Kitchen sale only: {Math.round(KIIK69_BASSIK_SHARE * 100)}% Bassik ·{" "}
            {Math.round(KIIK69_OUTLET_SHARE * 100)}% to selling outlet
          </li>
          <li>Example: ₹1,000 sale → ₹700 Bassik + ₹300 to KIIK / Sky High / Sound of Soul</li>
          <li>Party plates: ₹{KIIK69_PARTY_PLATE_RATE_INR} each</li>
        </ul>
      </div>
    );
  }
  if (moduleId === "daily" || moduleId === "games") {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
        <h2 className="text-lg font-semibold text-white">{mod?.label}</h2>
        <p className="mt-2 text-sm text-white/45">Coming soon — KIIK 69 only</p>
        <p className="mt-2 text-xs text-white/35">{mod?.hint}</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
      <p className="text-sm font-medium text-white/70">{mod?.label}</p>
      <p className="mt-1 text-xs text-white/40">{mod?.hint}</p>
      <p className="mt-4 text-xs text-white/30">Coming soon</p>
    </div>
  );
}

export default function Kiik69AccountsClient() {
  const [module, setModule] = useState<Kiik69AccountsModule>("purchases");
  const [showMore, setShowMore] = useState(false);
  const [addSignal, setAddSignal] = useState(0);
  const [aiSeed, setAiSeed] = useState<string | null>(null);

  const askAi = (prompt: string) => {
    setAiSeed(`${prompt}::${Date.now()}`);
    setModule("ai");
  };

  const current = KIIK69_ACCOUNTS_MODULES.find((m) => m.id === module);
  const mobileTitle = current?.label ?? "Accounts";
  const desktopTitle = current?.label ?? "Accounts";

  return (
    <div className="min-h-[100dvh] bg-[#06060a] text-white xl:flex xl:h-[100dvh]">
      <Kiik69SidebarNav active={module} onChange={setModule} />

      <div className="flex h-[100dvh] min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-[env(safe-area-inset-bottom)] xl:max-h-[100dvh] xl:pb-0">
        <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06060a]/95 backdrop-blur-md xl:static">
          <div className={KIIK69_PAGE}>
            <div className="flex items-center justify-between gap-2 pt-2 pb-1 xl:items-start xl:pt-5 xl:pb-2">
              <div className="flex min-w-0 flex-1 items-center gap-2.5 xl:block">
                <Image
                  src={LOGO}
                  alt="KIIK 69"
                  width={80}
                  height={80}
                  className="h-9 w-9 shrink-0 rounded-lg object-contain xl:hidden"
                  priority
                />
                <div className="min-w-0">
                  <h1 className="truncate text-base font-semibold tracking-tight xl:text-2xl">
                    <span className="xl:hidden">{mobileTitle}</span>
                    <span className="hidden xl:inline">{desktopTitle}</span>
                  </h1>
                  {current?.hint ? (
                    <p className="mt-0.5 text-[11px] text-white/35">{current.hint}</p>
                  ) : null}
                </div>
              </div>

              {module === "purchases" ? (
                <button
                  type="button"
                  onClick={() => setAddSignal((n) => n + 1)}
                  className="hidden shrink-0 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white xl:inline-flex"
                >
                  + Add purchase
                </button>
              ) : null}
            </div>
          </div>
        </header>

        <main
          className={`${KIIK69_PAGE} min-h-0 min-w-0 w-full max-w-full flex-1 overflow-y-auto overscroll-contain py-3 [-webkit-overflow-scrolling:touch] md:py-4 max-xl:pb-[var(--kiik69-dock-pad)] ${
            module === "ai" ? "flex flex-col overflow-hidden" : ""
          }`}
          style={{ ["--kiik69-dock-pad" as string]: KIIK69_DOCK_PADDING }}
        >
          {module === "purchases" ? (
            <Kiik69PurchasesView addSignal={addSignal} onAskAi={askAi} />
          ) : module === "ai" ? (
            <Kiik69AiPanel seedMessage={aiSeed?.split("::")[0] ?? null} />
          ) : (
            <ComingSoon moduleId={module} />
          )}
        </main>

        <Kiik69Dock
          module={module}
          onModule={setModule}
          onAdd={() => setAddSignal((n) => n + 1)}
          onMore={() => setShowMore(true)}
          showAdd={module === "purchases"}
        />
      </div>

      <Kiik69MoreSheet
        open={showMore}
        current={module}
        onClose={() => setShowMore(false)}
        onSelect={setModule}
      />
    </div>
  );
}
