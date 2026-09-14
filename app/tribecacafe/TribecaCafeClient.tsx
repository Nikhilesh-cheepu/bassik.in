"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SHOOT_CATEGORIES,
  currentYearMonth,
  dateKey,
  daysInMonth,
  formatYearMonthLabel,
  monthGridStartWeekday,
  stageLabel,
  stagesForKind,
  type CalendarKind,
} from "@/lib/tribeca";

type SetupItem = { id: string; label: string; status: string };
type CalItem = {
  id: string;
  date: string;
  kind: CalendarKind;
  title: string;
  category: string | null;
  stage: string;
  notes: string | null;
};
type BudgetEntry = {
  id: string;
  type: "add" | "use";
  amountInr: number;
  note: string | null;
  entryDate: string | null;
  createdAt: string;
};
type MonthPayload = {
  id: string;
  yearMonth: string;
  setupItems: SetupItem[];
  calendarItems: CalItem[];
  budgetEntries: BudgetEntry[];
};
type ShootProgress = { id: string; label: string; total: number; done: number };
type BudgetTotals = { added: number; used: number; remaining: number };

type TabId = "credentials" | "calendar" | "budget";

const TABS: { id: TabId; label: string }[] = [
  { id: "credentials", label: "Credentials" },
  { id: "calendar", label: "Calendar" },
  { id: "budget", label: "Ad budget" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const KIND_DOT: Record<CalendarKind, string> = {
  shoot: "#B8FF3C",
  event: "#A855F7",
  other: "#22D3EE",
};

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
  const done = status === "done";
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
        done
          ? "border-[#B8FF3C]/35 bg-[#B8FF3C]/15 text-[#B8FF3C]"
          : "border-white/15 bg-white/5 text-white/65"
      }`}
    >
      {stageLabel(status)}
    </span>
  );
}

function inr(n: number) {
  return n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

export default function TribecaCafeClient() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const [months, setMonths] = useState<string[]>([currentYearMonth()]);
  const [month, setMonth] = useState<MonthPayload | null>(null);
  const [shootProgress, setShootProgress] = useState<ShootProgress[]>([]);
  const [budget, setBudget] = useState<BudgetTotals>({ added: 0, used: 0, remaining: 0 });
  const [tab, setTab] = useState<TabId>("calendar");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const [newKind, setNewKind] = useState<CalendarKind>("shoot");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<string>(SHOOT_CATEGORIES[0].id);
  const [budgetType, setBudgetType] = useState<"add" | "use">("add");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetNote, setBudgetNote] = useState("");

  const monthLabel = formatYearMonthLabel(yearMonth);
  const totalDays = daysInMonth(yearMonth);
  const startPad = monthGridStartWeekday(yearMonth);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    for (const item of month?.calendarItems ?? []) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    return map;
  }, [month]);

  const selectedDate =
    selectedDay != null ? dateKey(yearMonth, selectedDay) : null;
  const dayItems = selectedDate ? itemsByDate.get(selectedDate) ?? [] : [];

  const loadMonth = useCallback(async (ym: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tribecacafe/month?month=${encodeURIComponent(ym)}`);
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");
      setMonth(data.month);
      setShootProgress(data.shootProgress ?? []);
      setBudget(data.budget ?? { added: 0, used: 0, remaining: 0 });
      setMonths(data.months?.length ? data.months : [ym]);
      setYearMonth(ym);
      setSelectedDay(null);
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
      const res = await fetch("/api/tribecacafe/auth");
      const data = await res.json();
      setAuthenticated(Boolean(data.authenticated));
      setAuthChecked(true);
      if (data.authenticated) await loadMonth(currentYearMonth());
    })();
  }, [loadMonth]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const res = await fetch("/api/tribecacafe/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAuthError(data.error || "Login failed");
      return;
    }
    setAuthenticated(true);
    setPassword("");
    await loadMonth(currentYearMonth());
  };

  const logout = async () => {
    await fetch("/api/tribecacafe/auth", { method: "DELETE" });
    setAuthenticated(false);
    setMonth(null);
  };

  const refresh = () => loadMonth(yearMonth);

  const patchCredential = async (id: string, status: string) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/tribecacafe/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const addCalendarItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!month || !selectedDate || !newTitle.trim()) return;
    setBusyId("cal-new");
    try {
      const res = await fetch("/api/tribecacafe/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthId: month.id,
          date: selectedDate,
          kind: newKind,
          title: newTitle,
          category: newKind === "shoot" ? newCategory : null,
        }),
      });
      if (res.ok) {
        setNewTitle("");
        await refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  const advanceItem = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/tribecacafe/calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, advance: true }),
      });
      if (res.ok) await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const addBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!month) return;
    const amount = Number(budgetAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setBusyId("budget-new");
    try {
      const res = await fetch("/api/tribecacafe/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthId: month.id,
          type: budgetType,
          amountInr: amount,
          note: budgetNote || null,
        }),
      });
      if (res.ok) {
        setBudgetAmount("");
        setBudgetNote("");
        await refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  if (!authChecked) return <div className="proposal-doc min-h-[100dvh]" />;

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
            Shared board for Bassik and Tribeca — one password.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="mt-5 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-[14px] font-semibold text-white outline-none focus:border-[#B8FF3C]/50"
          />
          {authError ? <p className="mt-2 text-[12px] font-bold text-[#F472B6]">{authError}</p> : null}
          <button
            type="submit"
            className="proposal-cta-lime mt-4 flex min-h-12 w-full items-center justify-center rounded-full text-[14px] font-bold"
          >
            Enter
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="proposal-doc min-h-[100dvh] text-white">
      <div className="mx-auto w-full max-w-[430px] pb-28 lg:max-w-5xl lg:pb-16">
        <header className="px-4 pb-3 pt-8 sm:px-6 lg:px-10 lg:pt-12">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="proposal-label">Bassik × Tribeca Cafe</p>
              <h1 className="proposal-glow-strong mt-1 font-[family-name:var(--font-agency-display)] text-[1.7rem] font-bold leading-tight lg:text-[2.2rem]">
                {monthLabel}
              </h1>
              <div className="proposal-underline" />
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-bold text-white/60"
            >
              Log out
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
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
                void loadMonth(currentYearMonth(new Date(y, m, 1)));
              }}
              className="rounded-full border border-[#B8FF3C]/30 bg-[#B8FF3C]/10 px-3 py-2 text-[12px] font-bold text-[#B8FF3C]"
            >
              + Next month
            </button>
          </div>

          <Card accent className="mt-4 !p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#B8FF3C]">
              Shoot progress by category
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {shootProgress.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-white/10 bg-black/30 px-2.5 py-2 text-center"
                >
                  <p className="text-[11px] font-bold text-white/70">{p.label}</p>
                  <p className="mt-0.5 font-[family-name:var(--font-agency-display)] text-[16px] font-bold text-white">
                    {p.done}
                    <span className="text-white/35">/{p.total}</span>
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
                tab === t.id ? "bg-[#B8FF3C] text-[#0b0c10]" : "border border-white/12 text-white/65"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <main className="mt-4 space-y-3 px-4 sm:px-6 lg:mt-6 lg:px-10">
          {loading && !month ? (
            <Card>
              <p className="text-[13px] font-semibold text-white/50">Loading…</p>
            </Card>
          ) : null}

          {tab === "credentials" && month ? (
            <>
              <p className="text-[13px] font-semibold text-white/55">
                Logins and access required to run digital for Tribeca.
              </p>
              {month.setupItems.map((item) => (
                <Card key={item.id}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[14px] font-bold text-white">{item.label}</p>
                    <StatusChip status={item.status === "done" ? "done" : "pending"} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {["todo", "doing", "done", "blocked"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => patchCredential(item.id, s)}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                          item.status === s
                            ? "bg-[#B8FF3C] text-[#0b0c10]"
                            : "border border-white/15 text-white/55"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </Card>
              ))}
            </>
          ) : null}

          {tab === "calendar" && month ? (
            <>
              <Card className="!p-3">
                <div className="mb-2 flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-wide text-white/45">
                  <span className="flex items-center gap-1.5">
                    <i className="h-2 w-2 rounded-full" style={{ background: KIND_DOT.shoot }} /> Shoot
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="h-2 w-2 rounded-full" style={{ background: KIND_DOT.event }} /> Event
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="h-2 w-2 rounded-full" style={{ background: KIND_DOT.other }} /> Other
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-white/40">
                  {WEEKDAYS.map((d) => (
                    <div key={d} className="py-1">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1">
                  {Array.from({ length: startPad }).map((_, i) => (
                    <div key={`pad-${i}`} className="aspect-square" />
                  ))}
                  {Array.from({ length: totalDays }).map((_, i) => {
                    const day = i + 1;
                    const key = dateKey(yearMonth, day);
                    const items = itemsByDate.get(key) ?? [];
                    const selected = selectedDay === day;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className={`flex aspect-square flex-col items-center justify-start rounded-xl border p-1 pt-1.5 transition ${
                          selected
                            ? "border-[#B8FF3C]/50 bg-[#B8FF3C]/15"
                            : "border-white/8 bg-black/25 hover:border-white/20"
                        }`}
                      >
                        <span className="text-[11px] font-bold text-white">{day}</span>
                        <div className="mt-auto flex flex-wrap justify-center gap-0.5 pb-0.5">
                          {items.slice(0, 4).map((it) => (
                            <i
                              key={it.id}
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ background: KIND_DOT[it.kind] }}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>

              {selectedDay != null && selectedDate ? (
                <>
                  <Card accent>
                    <p className="proposal-label">Add on {selectedDate}</p>
                    <form onSubmit={addCalendarItem} className="mt-3 space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={newKind}
                          onChange={(e) => setNewKind(e.target.value as CalendarKind)}
                          className="flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-[13px] font-semibold text-white"
                        >
                          <option value="shoot">Shoot</option>
                          <option value="event">Event</option>
                          <option value="other">Other</option>
                        </select>
                        {newKind === "shoot" ? (
                          <select
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            className="flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-[13px] font-semibold text-white"
                          >
                            {SHOOT_CATEGORIES.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </div>
                      <input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder={
                          newKind === "event"
                            ? "Event / band name"
                            : newKind === "shoot"
                              ? "Shoot title"
                              : "What is this?"
                        }
                        className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-[13px] font-semibold text-white outline-none"
                      />
                      <button
                        type="submit"
                        disabled={busyId === "cal-new"}
                        className="proposal-cta-lime flex min-h-11 w-full items-center justify-center rounded-full text-[13px] font-bold"
                      >
                        Add to calendar
                      </button>
                    </form>
                  </Card>

                  <p className="proposal-label">Todo · {selectedDate}</p>
                  {dayItems.length === 0 ? (
                    <Card>
                      <p className="text-[13px] font-semibold text-white/50">Nothing on this day yet.</p>
                    </Card>
                  ) : (
                    dayItems.map((item) => {
                      const stages = stagesForKind(item.kind);
                      const idx = stages.indexOf(item.stage);
                      const catLabel = SHOOT_CATEGORIES.find((c) => c.id === item.category)?.label;
                      return (
                        <Card key={item.id}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wide text-white/40">
                                {item.kind}
                                {catLabel ? ` · ${catLabel}` : ""}
                              </p>
                              <p className="mt-0.5 font-[family-name:var(--font-agency-display)] text-[15px] font-bold">
                                {item.title}
                              </p>
                            </div>
                            <StatusChip status={item.stage} />
                          </div>
                          <div className="mt-3 flex gap-1">
                            {stages.map((s, i) => (
                              <div
                                key={s}
                                className={`h-1.5 flex-1 rounded-full ${
                                  i <= idx ? "bg-[#B8FF3C]" : "bg-white/10"
                                }`}
                                title={stageLabel(s)}
                              />
                            ))}
                          </div>
                          <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                            {item.kind === "event"
                              ? "Creative pending → Done"
                              : item.kind === "shoot"
                                ? "Shoot → Production → Done"
                                : "Pending → Done"}
                          </p>
                          {item.stage !== "done" ? (
                            <button
                              type="button"
                              disabled={busyId === item.id}
                              onClick={() => advanceItem(item.id)}
                              className="proposal-cta-lime mt-3 flex min-h-10 w-full items-center justify-center rounded-full text-[13px] font-bold"
                            >
                              {item.kind === "event" ? "Mark creative done" : "Advance"}
                            </button>
                          ) : null}
                        </Card>
                      );
                    })
                  )}
                </>
              ) : (
                <Card>
                  <p className="text-[13px] font-semibold text-white/55">
                    Tap a date to add a shoot, event, or anything else — and track its todo.
                  </p>
                </Card>
              )}
            </>
          ) : null}

          {tab === "budget" && month ? (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                <Card className="!p-3.5 text-center">
                  <p className="text-[11px] font-bold text-white/45">Added</p>
                  <p className="mt-1 text-[18px] font-bold text-[#B8FF3C]">{inr(budget.added)}</p>
                </Card>
                <Card className="!p-3.5 text-center">
                  <p className="text-[11px] font-bold text-white/45">Used</p>
                  <p className="mt-1 text-[18px] font-bold text-[#F472B6]">{inr(budget.used)}</p>
                </Card>
                <Card accent className="!p-3.5 text-center">
                  <p className="text-[11px] font-bold text-white/45">Remaining</p>
                  <p className="mt-1 text-[18px] font-bold text-white">{inr(budget.remaining)}</p>
                </Card>
              </div>

              <Card accent>
                <p className="proposal-label">Log budget</p>
                <form onSubmit={addBudget} className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={budgetType}
                      onChange={(e) => setBudgetType(e.target.value as "add" | "use")}
                      className="rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-[13px] font-semibold text-white"
                    >
                      <option value="add">Add funds</option>
                      <option value="use">Use / spend</option>
                    </select>
                    <input
                      inputMode="decimal"
                      value={budgetAmount}
                      onChange={(e) => setBudgetAmount(e.target.value)}
                      placeholder="Amount ₹"
                      className="flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-[13px] font-semibold text-white outline-none"
                    />
                  </div>
                  <input
                    value={budgetNote}
                    onChange={(e) => setBudgetNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-[13px] font-semibold text-white outline-none"
                  />
                  <button
                    type="submit"
                    disabled={busyId === "budget-new"}
                    className="proposal-cta-lime flex min-h-11 w-full items-center justify-center rounded-full text-[13px] font-bold"
                  >
                    Save
                  </button>
                </form>
              </Card>

              {month.budgetEntries.length === 0 ? (
                <Card>
                  <p className="text-[13px] font-semibold text-white/50">No budget entries yet.</p>
                </Card>
              ) : (
                month.budgetEntries.map((e) => (
                  <Card key={e.id} className="!p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-bold uppercase text-white/40">
                          {e.type === "add" ? "Added" : "Used"}
                        </p>
                        <p className="text-[13px] font-semibold text-white/70">{e.note || "—"}</p>
                      </div>
                      <p
                        className={`text-[15px] font-bold ${
                          e.type === "add" ? "text-[#B8FF3C]" : "text-[#F472B6]"
                        }`}
                      >
                        {e.type === "add" ? "+" : "−"}
                        {inr(e.amountInr)}
                      </p>
                    </div>
                  </Card>
                ))
              )}
            </>
          ) : null}
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b0c10]/95 px-3 py-2.5 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-[430px] gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`min-h-11 flex-1 rounded-full text-[12px] font-bold ${
                tab === t.id ? "bg-[#B8FF3C] text-[#0b0c10]" : "text-white/55"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
