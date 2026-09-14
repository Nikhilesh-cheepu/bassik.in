"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CAMPAIGN_STAGES,
  FLYER_STATUSES,
  currentYearMonth,
  formatYearMonthLabel,
  monthIndexLabel,
  type TribecaPhaseId,
} from "@/lib/tribeca";
import type { TribecaRole } from "@/lib/tribeca-auth";

type SetupItem = {
  id: string;
  groupKey: string;
  itemKey: string;
  label: string;
  status: string;
  notes: string | null;
};
type Channel = { id: string; platform: string; label: string; status: string; notes: string | null };
type Campaign = { id: string; type: string; label: string; stage: string; notes: string | null };
type EventRow = {
  id: string;
  type: string;
  title: string;
  eventDate: string | null;
  flyerStatus: string;
  notes: string | null;
};
type RequestRow = {
  id: string;
  title: string;
  body: string | null;
  status: string;
  fromRole: string;
  answer: string | null;
};
type MonthPayload = {
  id: string;
  yearMonth: string;
  setupItems: SetupItem[];
  channels: Channel[];
  campaigns: Campaign[];
  events: EventRow[];
  requests: RequestRow[];
};
type Progress = {
  phases: {
    id: TribecaPhaseId;
    label: string;
    done: number;
    total: number;
    complete: boolean;
  }[];
  percent: number;
  activePhaseId: TribecaPhaseId;
};

type TabId = "overview" | "setup" | "channels" | "content" | "events" | "requests";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "setup", label: "Setup" },
  { id: "channels", label: "Channels" },
  { id: "content", label: "Content" },
  { id: "events", label: "Events" },
  { id: "requests", label: "Requests" },
];

function Card({
  children,
  accent = false,
  className = "",
}: {
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[1.35rem] p-4 lg:rounded-[1.5rem] lg:p-5 ${
        accent ? "proposal-glass-accent" : "proposal-glass"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const color =
    status === "done" || status === "live" || status === "posted" || status === "approved"
      ? "border-[#B8FF3C]/35 bg-[#B8FF3C]/15 text-[#B8FF3C]"
      : status === "blocked"
        ? "border-[#F472B6]/35 bg-[#F472B6]/15 text-[#F472B6]"
        : status === "doing" || status === "design" || status === "briefing" || status === "shoot" || status === "edit"
          ? "border-[#22D3EE]/35 bg-[#22D3EE]/15 text-[#22D3EE]"
          : "border-white/15 bg-white/5 text-white/60";
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${color}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

export default function TribecaCafeClient() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [role, setRole] = useState<TribecaRole>("bassik");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const [months, setMonths] = useState<string[]>([currentYearMonth()]);
  const [firstMonth, setFirstMonth] = useState(currentYearMonth());
  const [month, setMonth] = useState<MonthPayload | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState<"workshop" | "live_music">("workshop");
  const [eventDate, setEventDate] = useState("");
  const [reqTitle, setReqTitle] = useState("");
  const [reqBody, setReqBody] = useState("");

  const isBassik = role === "bassik";
  const monthLabel = formatYearMonthLabel(yearMonth);
  const monthTag = monthIndexLabel(yearMonth, firstMonth);

  const loadMonth = useCallback(async (ym: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tribeca-cafe/month?month=${encodeURIComponent(ym)}`);
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");
      setMonth(data.month);
      setProgress(data.progress);
      setMonths(data.months?.length ? data.months : [ym]);
      setFirstMonth(data.firstMonth || ym);
      setYearMonth(ym);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.body.classList.add("proposal-active");
    return () => document.body.classList.remove("proposal-active");
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/tribeca-cafe/auth");
      const data = await res.json();
      setAuthenticated(Boolean(data.authenticated));
      if (data.role) setRole(data.role);
      setAuthChecked(true);
      if (data.authenticated) await loadMonth(currentYearMonth());
    })();
  }, [loadMonth]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const res = await fetch("/api/tribeca-cafe/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAuthError(data.error || "Login failed");
      return;
    }
    setRole(data.role || "bassik");
    setAuthenticated(true);
    setPassword("");
    await loadMonth(currentYearMonth());
  };

  const logout = async () => {
    await fetch("/api/tribeca-cafe/auth", { method: "DELETE" });
    setAuthenticated(false);
    setMonth(null);
  };

  const refresh = () => loadMonth(yearMonth);

  const patchSetup = async (id: string, status: string) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/tribeca-cafe/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const patchChannel = async (id: string, status: string) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/tribeca-cafe/channels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const advanceCampaign = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/tribeca-cafe/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, advance: true }),
      });
      if (res.ok) await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!month || !eventTitle.trim()) return;
    setBusyId("event-new");
    try {
      const res = await fetch("/api/tribeca-cafe/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthId: month.id,
          title: eventTitle,
          type: eventType,
          eventDate: eventDate || null,
        }),
      });
      if (res.ok) {
        setEventTitle("");
        setEventDate("");
        await refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  const advanceEvent = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/tribeca-cafe/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, advance: true }),
      });
      if (res.ok) await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const addRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!month || !reqTitle.trim()) return;
    setBusyId("req-new");
    try {
      const res = await fetch("/api/tribeca-cafe/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthId: month.id, title: reqTitle, body: reqBody }),
      });
      if (res.ok) {
        setReqTitle("");
        setReqBody("");
        await refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  const answerRequest = async (id: string, answer: string) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/tribeca-cafe/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, answer, status: "answered" }),
      });
      if (res.ok) await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const openRequests = useMemo(
    () => month?.requests.filter((r) => r.status === "open").length ?? 0,
    [month]
  );

  if (!authChecked) {
    return <div className="proposal-doc min-h-[100dvh]" />;
  }

  if (!authenticated) {
    return (
      <div className="proposal-doc flex min-h-[100dvh] items-center justify-center px-4 text-white">
        <form onSubmit={login} className="proposal-glass w-full max-w-sm rounded-[1.5rem] p-6">
          <p className="proposal-label">Tribeca Cafe</p>
          <h1 className="proposal-glow-strong mt-2 font-[family-name:var(--font-agency-display)] text-[1.6rem] font-bold">
            Portal login
          </h1>
          <div className="proposal-underline" />
          <p className="mt-3 text-[13px] font-semibold text-white/55">
            Bassik team and cafe owners — same board, shared progress.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="mt-5 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-[14px] font-semibold text-white outline-none focus:border-[#B8FF3C]/50"
          />
          {authError ? <p className="mt-2 text-[12px] font-bold text-[#F472B6]">{authError}</p> : null}
          <button type="submit" className="proposal-cta-lime mt-4 flex min-h-12 w-full items-center justify-center rounded-full text-[14px] font-bold">
            Enter
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="proposal-doc min-h-[100dvh] text-white">
      <div className="mx-auto w-full max-w-[430px] pb-28 lg:max-w-5xl lg:pb-16">
        <header className="px-4 pb-4 pt-8 sm:px-6 lg:px-10 lg:pt-12">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="proposal-label">Bassik × Tribeca Cafe</p>
              <h1 className="proposal-glow-strong mt-1 font-[family-name:var(--font-agency-display)] text-[1.7rem] font-bold leading-tight lg:text-[2.2rem]">
                Monthly pipeline
              </h1>
              <div className="proposal-underline" />
              <p className="mt-2 text-[13px] font-semibold text-white/55">
                {monthTag} · {monthLabel} · signed in as {role}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-bold text-white/60"
            >
              Log out
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <select
              value={yearMonth}
              onChange={(e) => loadMonth(e.target.value)}
              className="rounded-full border border-white/15 bg-black/40 px-3 py-2 text-[12px] font-bold text-white"
            >
              {Array.from(new Set([yearMonth, ...months]))
                .sort()
                .map((m) => (
                  <option key={m} value={m}>
                    {formatYearMonthLabel(m)}
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={() => {
                const [y, m] = yearMonth.split("-").map(Number);
                const d = new Date(y, m - 1 + 1, 1);
                void loadMonth(currentYearMonth(d));
              }}
              className="rounded-full border border-[#B8FF3C]/30 bg-[#B8FF3C]/10 px-3 py-2 text-[12px] font-bold text-[#B8FF3C]"
            >
              + Next month
            </button>
          </div>

          <Card accent className="mt-4 !p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#B8FF3C]">
                {monthTag} progress
              </p>
              <p className="font-[family-name:var(--font-agency-display)] text-[18px] font-bold text-white">
                {progress?.percent ?? 0}%
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/50">
              <div
                className="h-full rounded-full bg-[#B8FF3C] shadow-[0_0_12px_rgba(184,255,60,0.6)] transition-all"
                style={{ width: `${progress?.percent ?? 0}%` }}
              />
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {(progress?.phases ?? []).map((phase, i) => (
                <div
                  key={phase.id}
                  className={`min-w-[108px] shrink-0 rounded-xl border px-3 py-2 ${
                    phase.complete
                      ? "border-[#B8FF3C]/40 bg-[#B8FF3C]/10"
                      : progress?.activePhaseId === phase.id
                        ? "border-[#A855F7]/40 bg-[#A855F7]/10"
                        : "border-white/10 bg-black/30"
                  }`}
                >
                  <p className="text-[10px] font-bold text-white/45">0{i + 1}</p>
                  <p className="text-[12px] font-bold text-white">{phase.label}</p>
                  <p className="mt-0.5 text-[10px] font-semibold text-white/50">
                    {phase.total === 0 ? "—" : `${phase.done}/${phase.total}`}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </header>

        <nav className="hidden gap-2 px-4 lg:flex lg:px-10">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-2 text-[12px] font-bold ${
                tab === t.id
                  ? "bg-[#B8FF3C] text-[#0b0c10]"
                  : "border border-white/12 text-white/65"
              }`}
            >
              {t.label}
              {t.id === "requests" && openRequests > 0 ? ` (${openRequests})` : ""}
            </button>
          ))}
        </nav>

        <main className="mt-4 space-y-3 px-4 sm:px-6 lg:mt-6 lg:px-10">
          {loading && !month ? (
            <Card>
              <p className="text-[13px] font-semibold text-white/50">Loading…</p>
            </Card>
          ) : null}

          {tab === "overview" && month && progress ? (
            <>
              <Card>
                <p className="proposal-label">This month</p>
                <p className="mt-2 text-[14px] font-semibold leading-relaxed text-white/75">
                  Pipeline for Tribeca Cafe: setup & credentials, channel management, content campaigns
                  (breakfast → workshops), and event flyers for live music / workshops. Use Requests when
                  something is needed from either side.
                </p>
              </Card>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {progress.phases.map((p) => (
                  <Card key={p.id} className="!p-3.5">
                    <p className="text-[12px] font-bold text-white">{p.label}</p>
                    <p className="mt-1 text-[20px] font-bold text-[#B8FF3C]">
                      {p.total === 0 ? "Add events" : `${p.done}/${p.total}`}
                    </p>
                    <StatusChip status={p.complete ? "done" : progress.activePhaseId === p.id ? "doing" : "todo"} />
                  </Card>
                ))}
              </div>
              {openRequests > 0 ? (
                <Card accent>
                  <p className="font-bold text-white">{openRequests} open request{openRequests === 1 ? "" : "s"}</p>
                  <button
                    type="button"
                    onClick={() => setTab("requests")}
                    className="mt-2 text-[13px] font-bold text-[#B8FF3C]"
                  >
                    Open Requests →
                  </button>
                </Card>
              ) : null}
            </>
          ) : null}

          {tab === "setup" && month ? (
            <>
              <p className="proposal-label">Onboarding</p>
              {month.setupItems
                .filter((i) => i.groupKey === "onboarding")
                .map((item) => (
                  <SetupRow
                    key={item.id}
                    item={item}
                    canEdit={isBassik}
                    busy={busyId === item.id}
                    onStatus={patchSetup}
                  />
                ))}
              <p className="proposal-label pt-2">Credentials</p>
              {month.setupItems
                .filter((i) => i.groupKey === "credentials")
                .map((item) => (
                  <SetupRow
                    key={item.id}
                    item={item}
                    canEdit={isBassik}
                    busy={busyId === item.id}
                    onStatus={patchSetup}
                  />
                ))}
            </>
          ) : null}

          {tab === "channels" && month ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {month.channels.map((ch) => (
                <Card key={ch.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-[family-name:var(--font-agency-display)] text-[15px] font-bold">
                      {ch.label}
                    </p>
                    <StatusChip status={ch.status} />
                  </div>
                  {isBassik ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {["todo", "doing", "live", "blocked"].map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={busyId === ch.id}
                          onClick={() => patchChannel(ch.id, s)}
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                            ch.status === s ? "bg-[#B8FF3C] text-[#0b0c10]" : "border border-white/15 text-white/55"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </Card>
              ))}
            </div>
          ) : null}

          {tab === "content" && month ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {month.campaigns.map((c) => {
                const stageIdx = CAMPAIGN_STAGES.indexOf(c.stage as (typeof CAMPAIGN_STAGES)[number]);
                return (
                  <Card key={c.id} accent={c.stage === "done"}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-[family-name:var(--font-agency-display)] text-[15px] font-bold">
                        {c.label}
                      </p>
                      <StatusChip status={c.stage} />
                    </div>
                    <div className="mt-3 flex gap-1">
                      {CAMPAIGN_STAGES.map((s, i) => (
                        <div
                          key={s}
                          className={`h-1.5 flex-1 rounded-full ${
                            i <= stageIdx ? "bg-[#B8FF3C]" : "bg-white/10"
                          }`}
                          title={s}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                      Plan → Shoot → Edit → Done
                    </p>
                    {isBassik && c.stage !== "done" ? (
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => advanceCampaign(c.id)}
                        className="proposal-cta-lime mt-3 flex min-h-10 w-full items-center justify-center rounded-full text-[13px] font-bold"
                      >
                        Advance stage
                      </button>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          ) : null}

          {tab === "events" && month ? (
            <>
              {isBassik ? (
                <Card accent>
                  <p className="proposal-label">Add workshop / live music</p>
                  <form onSubmit={addEvent} className="mt-3 space-y-2">
                    <input
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="Event title"
                      className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-[13px] font-semibold text-white outline-none"
                    />
                    <div className="flex gap-2">
                      <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value as "workshop" | "live_music")}
                        className="flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-[13px] font-semibold text-white"
                      >
                        <option value="workshop">Workshop</option>
                        <option value="live_music">Live music / band</option>
                      </select>
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-[13px] font-semibold text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={busyId === "event-new"}
                      className="proposal-cta-lime flex min-h-11 w-full items-center justify-center rounded-full text-[13px] font-bold"
                    >
                      Add event + flyer track
                    </button>
                  </form>
                </Card>
              ) : null}
              {month.events.length === 0 ? (
                <Card>
                  <p className="text-[13px] font-semibold text-white/55">No events this month yet.</p>
                </Card>
              ) : (
                month.events.map((ev) => {
                  const idx = FLYER_STATUSES.indexOf(ev.flyerStatus as (typeof FLYER_STATUSES)[number]);
                  return (
                    <Card key={ev.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-[family-name:var(--font-agency-display)] text-[15px] font-bold">
                            {ev.title}
                          </p>
                          <p className="mt-0.5 text-[12px] font-semibold text-white/45">
                            {ev.type === "live_music" ? "Live music" : "Workshop"}
                            {ev.eventDate ? ` · ${ev.eventDate}` : ""}
                          </p>
                        </div>
                        <StatusChip status={ev.flyerStatus} />
                      </div>
                      <div className="mt-3 flex gap-1">
                        {FLYER_STATUSES.map((s, i) => (
                          <div
                            key={s}
                            className={`h-1.5 flex-1 rounded-full ${i <= idx ? "bg-[#A855F7]" : "bg-white/10"}`}
                          />
                        ))}
                      </div>
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                        Needed → Briefing → Design → Approved → Posted
                      </p>
                      {isBassik && ev.flyerStatus !== "posted" ? (
                        <button
                          type="button"
                          disabled={busyId === ev.id}
                          onClick={() => advanceEvent(ev.id)}
                          className="mt-3 w-full rounded-full border border-[#A855F7]/40 bg-[#A855F7]/15 py-2.5 text-[13px] font-bold text-[#E9D5FF]"
                        >
                          Advance flyer
                        </button>
                      ) : null}
                    </Card>
                  );
                })
              )}
            </>
          ) : null}

          {tab === "requests" && month ? (
            <>
              <Card accent>
                <p className="proposal-label">Ask for something</p>
                <form onSubmit={addRequest} className="mt-3 space-y-2">
                  <input
                    value={reqTitle}
                    onChange={(e) => setReqTitle(e.target.value)}
                    placeholder="What do you need?"
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-[13px] font-semibold text-white outline-none"
                  />
                  <textarea
                    value={reqBody}
                    onChange={(e) => setReqBody(e.target.value)}
                    placeholder="Details (optional)"
                    rows={3}
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-[13px] font-semibold text-white outline-none"
                  />
                  <button
                    type="submit"
                    disabled={busyId === "req-new"}
                    className="proposal-cta-lime flex min-h-11 w-full items-center justify-center rounded-full text-[13px] font-bold"
                  >
                    Post request
                  </button>
                </form>
              </Card>
              {month.requests.map((r) => (
                <Card key={r.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[14px] font-bold text-white">{r.title}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-white/45">
                        From {r.fromRole}
                      </p>
                    </div>
                    <StatusChip status={r.status} />
                  </div>
                  {r.body ? (
                    <p className="mt-2 text-[13px] font-semibold text-white/65">{r.body}</p>
                  ) : null}
                  {r.answer ? (
                    <p className="mt-2 rounded-xl border border-[#B8FF3C]/25 bg-[#B8FF3C]/10 p-3 text-[13px] font-semibold text-white/80">
                      Reply: {r.answer}
                    </p>
                  ) : r.status === "open" ? (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => {
                        const answer = window.prompt("Reply to this request");
                        if (answer?.trim()) void answerRequest(r.id, answer.trim());
                      }}
                      className="mt-3 w-full rounded-full border border-white/15 py-2.5 text-[13px] font-bold text-white/80"
                    >
                      Reply
                    </button>
                  ) : null}
                </Card>
              ))}
            </>
          ) : null}
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b0c10]/95 px-2 py-2 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-[430px] gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`min-w-[4.6rem] shrink-0 rounded-full px-2 py-2.5 text-[10px] font-bold ${
                tab === t.id ? "bg-[#B8FF3C] text-[#0b0c10]" : "text-white/55"
              }`}
            >
              {t.label}
              {t.id === "requests" && openRequests ? ` ${openRequests}` : ""}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SetupRow({
  item,
  canEdit,
  busy,
  onStatus,
}: {
  item: SetupItem;
  canEdit: boolean;
  busy: boolean;
  onStatus: (id: string, status: string) => void;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[14px] font-bold text-white">{item.label}</p>
        <StatusChip status={item.status} />
      </div>
      {canEdit ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["todo", "doing", "done", "blocked"].map((s) => (
            <button
              key={s}
              type="button"
              disabled={busy}
              onClick={() => onStatus(item.id, s)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                item.status === s ? "bg-[#B8FF3C] text-[#0b0c10]" : "border border-white/15 text-white/55"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
