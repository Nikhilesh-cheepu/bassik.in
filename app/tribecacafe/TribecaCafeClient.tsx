"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  SHOOT_CATEGORIES,
  EVENT_CATEGORIES,
  PROGRESS_CATEGORIES,
  addDaysToDateKey,
  buildDateStrip,
  categoryLabel,
  computeShootCategoryProgress,
  currentYearMonth,
  formatStripDay,
  formatYearMonthLabel,
  isStageBackward,
  itemListLabel,
  nextStageLabel,
  stageLabel,
  stagesForKind,
  toDateKey,
  yearMonthFromDateKey,
  type CalendarKind,
} from "@/lib/tribeca";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import {
  FacebookIcon,
  GoogleAdsIcon,
  GoogleIcon,
  GoogleMapsIcon,
  InstagramIcon,
  LinkedInIcon,
  MetaIcon,
  YouTubeIcon,
} from "@/components/agency/ProposalPlatformIcons";
import { TRIBECA_PLAN, type PlanIcon, type PlanPlatformId } from "@/lib/tribeca-plan";

type SetupItem = {
  id: string;
  label: string;
  status: string;
  itemKey: string;
  notes: string | null;
};
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
};
type MonthPayload = {
  id: string;
  yearMonth: string;
  notes: string | null;
  setupItems: SetupItem[];
  calendarItems: CalItem[];
  budgetEntries: BudgetEntry[];
};

const PLAN_PLATFORM_META: Record<
  PlanPlatformId,
  { label: string; color: string; delay: string; Icon: (p: { className?: string }) => React.ReactNode }
> = {
  instagram: { label: "Instagram", color: "#E1306C", delay: "0s", Icon: InstagramIcon },
  facebook: { label: "Facebook", color: "#1877F2", delay: "0.2s", Icon: FacebookIcon },
  meta: { label: "Meta ads", color: "#0081FB", delay: "0.4s", Icon: MetaIcon },
  google: { label: "Google", color: "#4285F4", delay: "0.6s", Icon: GoogleIcon },
  google_ads: { label: "Google Ads", color: "#FBBC04", delay: "0.8s", Icon: GoogleAdsIcon },
  maps: { label: "Google Maps", color: "#EA4335", delay: "1s", Icon: GoogleMapsIcon },
  youtube: { label: "YouTube", color: "#FF0000", delay: "1.2s", Icon: YouTubeIcon },
  linkedin: { label: "LinkedIn", color: "#0A66C2", delay: "1.4s", Icon: LinkedInIcon },
};

function PlanPlatformGlyph({
  id,
  size = "md",
}: {
  id: PlanPlatformId;
  size?: "sm" | "md";
}) {
  const meta = PLAN_PLATFORM_META[id];
  const box = size === "sm" ? "h-7 w-7 rounded-lg" : "h-12 w-12 rounded-2xl";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-6 w-6";
  return (
    <div
      className={`tribeca-platform-glow flex shrink-0 items-center justify-center ${box}`}
      style={{ borderColor: meta.color, color: meta.color, animationDelay: meta.delay }}
      title={meta.label}
      aria-label={meta.label}
    >
      <meta.Icon className={icon} />
    </div>
  );
}
type ShootProgress = { id: string; label: string; total: number; done: number };
type BudgetTotals = { added: number; used: number; remaining: number };
type TabId = "credentials" | "calendar" | "todo" | "budget" | "plan";
type StatusTone = "idle" | "syncing" | "saving" | "ok" | "error";
type UiStatus = { tone: StatusTone; message: string };

type NavTab = { id: Exclude<TabId, "plan">; label: string };

/** Bottom + desktop nav — Plan stays header-only. */
const TABS: NavTab[] = [
  { id: "credentials", label: "Credentials" },
  { id: "calendar", label: "Calendar" },
  { id: "todo", label: "Todo" },
  { id: "budget", label: "Ad budget" },
];

const KIND_COLOR: Record<CalendarKind, string> = {
  shoot: "#B8FF3C",
  event: "#C084FC",
  other: "#38BDF8",
};

const PAST_DAYS = 45;
const FUTURE_DAYS = 90;

const EMPTY_PROGRESS: ShootProgress[] = PROGRESS_CATEGORIES.map((c) => ({
  id: c.id,
  label: c.label,
  total: 0,
  done: 0,
}));

function PlanGlyph({ name }: { name: PlanIcon }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "food":
      return (
        <svg {...common}>
          <path d="M8 3v8M8 11c0 4 0 7 0 10M16 3v6c0 2-1.5 3-3 3h0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 12v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "vibe":
      return (
        <svg {...common}>
          <path d="M4 20V10l8-6 8 6v10" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M10 20v-6h4v6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "live":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
          <path d="M5 12a7 7 0 0114 0M2 12a10 10 0 0120 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "maps":
      return (
        <svg {...common}>
          <path d="M12 21s7-5.2 7-11a7 7 0 10-14 0c0 5.8 7 11 7 11z" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "ads":
      return (
        <svg {...common}>
          <path d="M4 12h3l3-7 3 14 3-7h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
          <path d="M11 9.5v5l4.5-2.5L11 9.5z" fill="currentColor" />
        </svg>
      );
    case "team":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="2.5" stroke="currentColor" strokeWidth="2" />
          <circle cx="16" cy="9" r="2" stroke="currentColor" strokeWidth="2" />
          <path d="M4 18c1.2-2.5 3-3.5 5-3.5S12.8 15.5 14 18M14 15c1.2-.6 2.2-.7 3.5-.5 1.2.2 2.2.8 2.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "note":
      return (
        <svg {...common}>
          <path d="M6 4h9l3 3v13H6V4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 10h6M9 14h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M4 12h16M12 4l8 8-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

function Solid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-[#2c2e38] bg-[#14161d] p-4 ${className}`}>
      {children}
    </div>
  );
}

function inr(n: number) {
  return n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

function StatusBar({ status }: { status: UiStatus }) {
  if (status.tone === "idle") return null;
  const color =
    status.tone === "error"
      ? "text-[#F472B6]"
      : status.tone === "ok"
        ? "text-[#B8FF3C]"
        : "text-white/80";
  const showBar = status.tone === "syncing" || status.tone === "saving";
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-[#2c2e38] bg-[#14161d] px-3 py-2.5">
      <div className="flex items-center gap-2">
        {showBar ? (
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#B8FF3C]" />
        ) : (
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              status.tone === "ok" ? "bg-[#B8FF3C]" : "bg-[#F472B6]"
            }`}
          />
        )}
        <p className={`text-[12px] font-bold ${color}`}>{status.message}</p>
      </div>
      {showBar ? <div className="mt-2 h-1 animate-pulse rounded-full bg-[#B8FF3C]" /> : null}
    </div>
  );
}

function DayRow({
  dateKey,
  isToday,
  items,
  onOpen,
}: {
  dateKey: string;
  isToday: boolean;
  items: CalItem[];
  onOpen: () => void;
}) {
  const meta = formatStripDay(dateKey);
  const primary = items[0];
  const preview = primary ? itemListLabel(primary) : null;
  const extra = items.length > 1 ? ` +${items.length - 1}` : "";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-center gap-3.5 border-b border-[#22242c] px-4 py-3.5 text-left ${
        isToday ? "bg-[#1a2410]" : "bg-[#14161d] active:bg-[#1a1c24]"
      }`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl ${
          isToday ? "bg-[#B8FF3C] text-[#0b0c10]" : "bg-[#1c1e26] text-white"
        }`}
      >
        <span
          className={`text-[9px] font-extrabold uppercase tracking-wide ${
            isToday ? "text-[#0b0c10]/70" : "text-white/45"
          }`}
        >
          {meta.weekday}
        </span>
        <span className="text-[18px] font-extrabold leading-none">{meta.day}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[11px] font-extrabold ${isToday ? "text-[#B8FF3C]" : "text-white/40"}`}>
          {isToday ? "Today" : `${meta.month} ${meta.day}`}
        </p>
        {preview ? (
          <>
            <p className="mt-0.5 truncate text-[12px] font-bold text-white/50">
              {categoryLabel(primary.kind, primary.category)
                ? primary.kind === "shoot"
                  ? `${categoryLabel(primary.kind, primary.category)} shoot`
                  : categoryLabel(primary.kind, primary.category)
                : primary.kind}
              {extra}
            </p>
            <p className="truncate text-[14px] font-bold text-white">{primary.title}</p>
          </>
        ) : (
          <p className="mt-0.5 text-[13px] font-semibold text-white/30">Empty · tap to add</p>
        )}
      </div>
      <span className="text-white/25">›</span>
    </button>
  );
}

export default function TribecaCafeClient() {
  const searchParams = useSearchParams();
  const todayKey = useMemo(() => toDateKey(), []);
  const todayMeta = useMemo(() => formatStripDay(todayKey), [todayKey]);
  const dateList = useMemo(() => buildDateStrip(todayKey, PAST_DAYS, FUTURE_DAYS), [todayKey]);
  const pastDates = useMemo(() => dateList.slice(0, PAST_DAYS), [dateList]);
  const todayAndFuture = useMemo(() => dateList.slice(PAST_DAYS), [dateList]);

  const listRef = useRef<HTMLDivElement>(null);
  const pastRef = useRef<HTMLDivElement>(null);
  const pinnedOnce = useRef(false);

  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const [month, setMonth] = useState<MonthPayload | null>(null);
  const [rangeItems, setRangeItems] = useState<CalItem[]>([]);
  const [shootProgress, setShootProgress] = useState<ShootProgress[]>(EMPTY_PROGRESS);
  const [budget, setBudget] = useState<BudgetTotals>({ added: 0, used: 0, remaining: 0 });
  const [tab, setTab] = useState<TabId>("calendar");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uiStatus, setUiStatus] = useState<UiStatus>({ tone: "idle", message: "" });
  const [showJumpToday, setShowJumpToday] = useState(false);
  const statusTimer = useRef<number | null>(null);

  const [sheetDate, setSheetDate] = useState<string | null>(null);
  const [sheetAddMore, setSheetAddMore] = useState(false);
  const [notesItemId, setNotesItemId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState("");
  const [newKind, setNewKind] = useState<CalendarKind>("shoot");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<string>(SHOOT_CATEGORIES[0].id);
  const [budgetType, setBudgetType] = useState<"add" | "use">("add");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetNote, setBudgetNote] = useState("");
  const [todoMenuId, setTodoMenuId] = useState<string | null>(null);
  const [todoEditId, setTodoEditId] = useState<string | null>(null);
  const [stageBackPrompt, setStageBackPrompt] = useState<{
    itemId: string;
    targetStage: string;
  } | null>(null);
  const [stageBackPassword, setStageBackPassword] = useState("");
  const [stageBackError, setStageBackError] = useState("");

  useBodyScrollLock(Boolean(sheetDate) || Boolean(stageBackPrompt), {
    pinBody: true,
  });

  const accessItems = month?.setupItems ?? [];

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    for (const item of rangeItems) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    return map;
  }, [rangeItems]);

  const sheetItems = sheetDate ? itemsByDate.get(sheetDate) ?? [] : [];
  const showAddForm = Boolean(sheetDate) && (sheetItems.length === 0 || sheetAddMore);
  const openTodos = useMemo(() => rangeItems.filter((i) => i.stage !== "done"), [rangeItems]);

  const flashStatus = useCallback((tone: StatusTone, message: string, holdMs = 1800) => {
    if (statusTimer.current) window.clearTimeout(statusTimer.current);
    setUiStatus({ tone, message });
    if (tone === "ok" || tone === "error") {
      statusTimer.current = window.setTimeout(() => {
        setUiStatus({ tone: "idle", message: "" });
      }, holdMs);
    }
  }, []);

  const refreshProgressFromItems = useCallback((items: CalItem[], ym: string) => {
    setShootProgress(computeShootCategoryProgress(items.filter((i) => i.date.startsWith(ym))));
  }, []);

  const pinToday = useCallback((smooth = false) => {
    const list = listRef.current;
    const past = pastRef.current;
    if (!list || !past) return false;
    if (list.clientHeight < 80) return false;
    list.scrollTo({
      top: past.offsetHeight,
      behavior: smooth ? "smooth" : "auto",
    });
    setShowJumpToday(false);
    return true;
  }, []);

  const applyMonthPayload = (data: {
    month: MonthPayload;
    rangeItems?: CalItem[];
    shootProgress?: ShootProgress[];
    budget?: BudgetTotals;
  }) => {
    setMonth({ ...data.month, notes: data.month.notes ?? null });
    if (data.rangeItems) setRangeItems(data.rangeItems);
    setShootProgress(data.shootProgress?.length ? data.shootProgress : EMPTY_PROGRESS);
    setBudget(data.budget ?? { added: 0, used: 0, remaining: 0 });
    setYearMonth(data.month.yearMonth);
  };

  const loadMonth = useCallback(
    async (ym: string, quiet = false) => {
      setLoading(true);
      if (!quiet) flashStatus("syncing", "Loading data…");
      try {
        const from = addDaysToDateKey(toDateKey(), -PAST_DAYS);
        const to = addDaysToDateKey(toDateKey(), FUTURE_DAYS);
        const qs = new URLSearchParams({ month: ym, from, to });
        const res = await fetch(`/api/tribecacafe/month?${qs}`);
        if (res.status === 401) {
          setAuthenticated(false);
          flashStatus("error", "Session expired — log in again");
          return false;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Load failed");
        applyMonthPayload(data);
        flashStatus("ok", "Up to date");
        return true;
      } catch (e) {
        console.error(e);
        flashStatus("error", "Could not load — check connection");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [flashStatus]
  );

  useEffect(() => {
    document.body.classList.add("proposal-active");
    return () => document.body.classList.remove("proposal-active");
  }, []);

  useEffect(() => {
    const raw = searchParams.get("tab");
    if (
      raw === "credentials" ||
      raw === "calendar" ||
      raw === "todo" ||
      raw === "budget" ||
      raw === "plan"
    ) {
      setTab(raw);
    }
  }, [searchParams]);

  // Fast auth → show calendar immediately; data loads in background
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/tribecacafe/auth");
        const data = await res.json();
        setAuthChecked(true);
        if (!data.authenticated) {
          setAuthenticated(false);
          return;
        }
        setAuthenticated(true);
        void loadMonth(currentYearMonth());
      } catch {
        setAuthChecked(true);
        setAuthenticated(false);
      }
    })();
  }, [loadMonth]);

  // Pin once: scrollPast height so today sits at the top of the viewport
  useLayoutEffect(() => {
    if (tab !== "calendar" || !authenticated) return;
    pinnedOnce.current = false;

    const list = listRef.current;
    const past = pastRef.current;
    if (!list || !past) return;

    const ro = new ResizeObserver(() => {
      if (pinnedOnce.current) return;
      if (pinToday(false)) {
        pinnedOnce.current = true;
        ro.disconnect();
      }
    });
    ro.observe(list);
    ro.observe(past);

    const raf = requestAnimationFrame(() => {
      if (pinnedOnce.current) return;
      if (pinToday(false)) {
        pinnedOnce.current = true;
        ro.disconnect();
      }
    });
    const t = window.setTimeout(() => {
      if (pinnedOnce.current) return;
      if (pinToday(false)) {
        pinnedOnce.current = true;
        ro.disconnect();
      }
    }, 50);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.clearTimeout(t);
    };
  }, [tab, authenticated, pinToday]);

  const onListScroll = () => {
    const list = listRef.current;
    const past = pastRef.current;
    if (!list || !past) return;
    setShowJumpToday(Math.abs(list.scrollTop - past.offsetHeight) > 90);
  };

  const openDay = (key: string) => {
    setSheetDate(key);
    setSheetAddMore(false);
    setNotesItemId(null);
    setNotesDraft("");
    setEditingId(null);
    setNewTitle("");
    setNewKind("shoot");
    setNewCategory(SHOOT_CATEGORIES[0].id);
    const ym = yearMonthFromDateKey(key);
    if (ym !== yearMonth) void loadMonth(ym);
  };

  const closeSheet = () => {
    setSheetDate(null);
    setSheetAddMore(false);
    setNotesItemId(null);
    setNotesDraft("");
    setEditingId(null);
  };

  const startEditItem = (item: CalItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDate(item.date);
    setEditCategory(item.category || (item.kind === "event" ? EVENT_CATEGORIES[0].id : SHOOT_CATEGORIES[0].id));
    setNotesItemId(null);
    setSheetAddMore(false);
  };

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
    pinnedOnce.current = false;
    void loadMonth(currentYearMonth());
  };

  const logout = async () => {
    await fetch("/api/tribecacafe/auth", { method: "DELETE" });
    setAuthenticated(false);
    setMonth(null);
    setRangeItems([]);
  };

  const setCredential = async (id: string, next: "pending" | "done") => {
    setBusyId(id);
    flashStatus("saving", next === "done" ? "Marking done…" : "Marking pending…");
    try {
      const res = await fetch("/api/tribecacafe/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
      if (!res.ok) {
        flashStatus("error", "Update failed");
        return;
      }
      setMonth((m) =>
        m
          ? {
              ...m,
              setupItems: m.setupItems.map((i) => (i.id === id ? { ...i, status: next } : i)),
            }
          : m
      );
      flashStatus("ok", "Saved");
    } catch {
      flashStatus("error", "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const saveItemNotes = async (itemId: string) => {
    setBusyId(`notes-${itemId}`);
    flashStatus("saving", "Saving notes…");
    try {
      const res = await fetch("/api/tribecacafe/calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, notes: notesDraft }),
      });
      if (!res.ok) {
        flashStatus("error", "Notes save failed");
        return;
      }
      const data = await res.json();
      const saved = data.item as CalItem;
      setRangeItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, notes: saved.notes } : i)));
      setNotesItemId(null);
      flashStatus("ok", "Notes saved");
    } catch {
      flashStatus("error", "Notes save failed");
    } finally {
      setBusyId(null);
    }
  };

  const saveEditItem = async (item: CalItem) => {
    if (!editTitle.trim() || !editDate) return;
    setBusyId(`edit-${item.id}`);
    flashStatus("saving", "Saving edits…");
    const prevDate = item.date;
    try {
      const payload: Record<string, unknown> = {
        id: item.id,
        title: editTitle.trim(),
        date: editDate,
      };
      if (item.kind === "shoot" || item.kind === "event") {
        payload.category = editCategory;
      }
      const res = await fetch("/api/tribecacafe/calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        flashStatus("error", "Edit failed");
        return;
      }
      const data = await res.json();
      const saved = data.item as CalItem;
      setRangeItems((prev) => {
        const next = prev.map((i) => (i.id === item.id ? { ...i, ...saved } : i));
        refreshProgressFromItems(next, yearMonthFromDateKey(saved.date));
        if (prevDate !== saved.date) {
          refreshProgressFromItems(next, yearMonthFromDateKey(prevDate));
        }
        return next;
      });
      if (sheetDate && saved.date !== sheetDate) {
        setSheetDate(saved.date);
        const ym = yearMonthFromDateKey(saved.date);
        if (ym !== yearMonth) void loadMonth(ym, true);
      }
      setEditingId(null);
      flashStatus("ok", "Updated");
    } catch {
      flashStatus("error", "Edit failed");
    } finally {
      setBusyId(null);
    }
  };

  const deleteCalendarItem = async (item: CalItem) => {
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    setBusyId(`del-${item.id}`);
    flashStatus("saving", "Deleting…");
    try {
      const res = await fetch(`/api/tribecacafe/calendar?id=${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        flashStatus("error", "Delete failed");
        return;
      }
      setRangeItems((prev) => {
        const next = prev.filter((i) => i.id !== item.id);
        refreshProgressFromItems(next, yearMonthFromDateKey(item.date));
        return next;
      });
      setEditingId(null);
      setNotesItemId(null);
      flashStatus("ok", "Deleted");
    } catch {
      flashStatus("error", "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const addCalendarItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetDate || !newTitle.trim()) return;
    if (newKind === "shoot" || newKind === "event") {
      if (!newCategory) return;
    }
    const ym = yearMonthFromDateKey(sheetDate);
    const title = newTitle.trim();
    const category = newKind === "other" ? null : newCategory;
    const tempId = `temp-${Date.now()}`;
    const optimistic: CalItem = {
      id: tempId,
      date: sheetDate,
      kind: newKind,
      title,
      category,
      stage: newKind === "shoot" ? "shoot" : newKind === "event" ? "creative_pending" : "pending",
      notes: null,
    };

    setBusyId("cal-new");
    flashStatus("saving", "Adding to log…");
    setRangeItems((prev) => {
      const next = [...prev, optimistic];
      refreshProgressFromItems(next, ym);
      return next;
    });
    setNewTitle("");
    setSheetAddMore(false);

    try {
      const res = await fetch("/api/tribecacafe/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: sheetDate,
          kind: newKind,
          title,
          category,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRangeItems((prev) => {
          const next = prev.filter((i) => i.id !== tempId);
          refreshProgressFromItems(next, ym);
          return next;
        });
        flashStatus("error", data.error || "Could not add — try again");
        return;
      }
      const saved = data.item as CalItem;
      setRangeItems((prev) => {
        const next = prev.map((i) => (i.id === tempId ? saved : i));
        refreshProgressFromItems(next, ym);
        return next;
      });
      setMonth((m) =>
        m && m.yearMonth === ym
          ? { ...m, calendarItems: [...m.calendarItems.filter((i) => i.id !== tempId), saved] }
          : m
      );
      flashStatus("ok", "Added to log");
    } catch {
      setRangeItems((prev) => {
        const next = prev.filter((i) => i.id !== tempId);
        refreshProgressFromItems(next, ym);
        return next;
      });
      flashStatus("error", "Could not add — try again");
    } finally {
      setBusyId(null);
    }
  };

  const advanceItem = async (id: string) => {
    setBusyId(id);
    flashStatus("saving", "Updating stage…");
    try {
      const res = await fetch("/api/tribecacafe/calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, advance: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        flashStatus("error", "Advance failed");
        return;
      }
      const saved = data.item as CalItem;
      setRangeItems((prev) => {
        const next = prev.map((i) => (i.id === id ? { ...i, ...saved } : i));
        refreshProgressFromItems(next, yearMonth);
        return next;
      });
      flashStatus("ok", "Stage updated");
    } catch {
      flashStatus("error", "Advance failed");
    } finally {
      setBusyId(null);
    }
  };

  const setItemStage = async (item: CalItem, targetStage: string, backPassword?: string) => {
    setBusyId(item.id);
    flashStatus("saving", "Updating stage…");
    try {
      const res = await fetch("/api/tribecacafe/calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          stage: targetStage,
          ...(backPassword ? { stageBackPassword: backPassword } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setStageBackError("Wrong password");
        flashStatus("error", "Wrong password");
        return false;
      }
      if (!res.ok) {
        flashStatus("error", data.error || "Stage update failed");
        return false;
      }
      const saved = data.item as CalItem;
      setRangeItems((prev) => {
        const next = prev.map((i) => (i.id === item.id ? { ...i, ...saved } : i));
        refreshProgressFromItems(next, yearMonth);
        return next;
      });
      setStageBackPrompt(null);
      setStageBackPassword("");
      setStageBackError("");
      flashStatus("ok", `Moved to ${stageLabel(targetStage, item.kind)}`);
      return true;
    } catch {
      flashStatus("error", "Stage update failed");
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const requestStageChange = (item: CalItem, targetStage: string) => {
    if (targetStage === item.stage) return;
    if (isStageBackward(item.kind, item.stage, targetStage)) {
      setStageBackPrompt({ itemId: item.id, targetStage });
      setStageBackPassword("");
      setStageBackError("");
      setTodoMenuId(null);
      return;
    }
    void setItemStage(item, targetStage);
  };

  const addBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!month) return;
    const amount = Number(budgetAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setBusyId("budget-new");
    flashStatus("saving", budgetType === "add" ? "Logging added…" : "Logging used…");
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        flashStatus("error", "Budget save failed");
        return;
      }
      const entry = {
        ...data.entry,
        amountInr: Number(data.entry.amountInr),
      } as BudgetEntry;
      setMonth((m) =>
        m ? { ...m, budgetEntries: [entry, ...m.budgetEntries] } : m
      );
      setBudget((b) => {
        if (budgetType === "add") {
          return { added: b.added + amount, used: b.used, remaining: b.remaining + amount };
        }
        return { added: b.added, used: b.used + amount, remaining: b.remaining - amount };
      });
      setBudgetAmount("");
      setBudgetNote("");
      flashStatus("ok", "Budget logged");
    } catch {
      flashStatus("error", "Budget save failed");
    } finally {
      setBusyId(null);
    }
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b0c10] text-white">
        <p className="text-[13px] font-bold text-white/40">Loading…</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b0c10] px-4 text-white">
        <form onSubmit={login} className="w-full max-w-sm rounded-2xl border border-[#2c2e38] bg-[#14161d] p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">Tribeca Cafe</p>
          <h1 className="mt-3 font-[family-name:var(--font-agency-display)] text-[1.7rem] font-bold">
            Portal login
          </h1>
          <div className="mt-3 h-1 w-16 rounded-full bg-[#B8FF3C]" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="mt-6 w-full rounded-xl border border-[#2c2e38] bg-[#0b0c10] px-4 py-3.5 text-[14px] font-semibold text-white outline-none focus:border-[#B8FF3C]/50"
          />
          {authError ? <p className="mt-2 text-[12px] font-bold text-[#F472B6]">{authError}</p> : null}
          <button
            type="submit"
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-[#B8FF3C] text-[14px] font-bold text-[#0b0c10]"
          >
            Enter
          </button>
        </form>
      </div>
    );
  }

  const sheetMeta = sheetDate ? formatStripDay(sheetDate) : null;

  return (
    <div className="min-h-[100dvh] bg-[#0b0c10] text-white">
      <div className="mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col lg:max-w-3xl">
        {/* Slim header — less congestion */}
        <header className="shrink-0 px-5 pb-4 pt-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">
                Bassik × Tribeca
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-agency-display)] text-[1.55rem] font-bold leading-none">
                {todayMeta.day} {todayMeta.month}
              </h1>
              <p className="mt-1.5 text-[13px] font-semibold text-white/40">
                {formatYearMonthLabel(yearMonth)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setTab("plan")}
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                  tab === "plan"
                    ? "bg-[#B8FF3C] text-[#0b0c10]"
                    : "border border-[#2c2e38] bg-[#14161d] text-white/70"
                }`}
              >
                Plan
              </button>
              <button
                type="button"
                onClick={logout}
                className="rounded-full border border-[#2c2e38] px-3 py-1.5 text-[11px] font-bold text-white/45"
              >
                Log out
              </button>
            </div>
          </div>

          <StatusBar status={uiStatus} />

          <div
            className={`-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
              tab === "plan" ? "hidden" : ""
            }`}
          >
            {shootProgress.map((p) => (
              <div
                key={p.id}
                className="shrink-0 rounded-full border border-[#2c2e38] bg-[#14161d] px-2.5 py-1 text-[11px] font-extrabold text-white/70"
              >
                {p.label}{" "}
                <span className="text-[#B8FF3C]">
                  {p.done}/{p.total}
                </span>
              </div>
            ))}
          </div>

          <nav className="mt-4 hidden gap-2 lg:flex">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  if (t.id === "calendar") pinnedOnce.current = false;
                }}
                className={`rounded-full px-4 py-2 text-[12px] font-bold ${
                  tab === t.id
                    ? "bg-[#B8FF3C] text-[#0b0c10]"
                    : "border border-[#2c2e38] text-white/55"
                }`}
              >
                {t.label}
                {t.id === "todo" && openTodos.length ? ` (${openTodos.length})` : ""}
              </button>
            ))}
          </nav>
        </header>

        <main
          className={`min-h-0 flex-1 ${
            tab === "calendar" ? "relative flex flex-col px-0 pb-[4.5rem]" : "space-y-3 overflow-y-auto px-5 pb-28"
          }`}
        >
          {tab === "credentials" ? (
            !month ? (
              <p className="text-[13px] font-semibold text-white/40">Loading credentials…</p>
            ) : (
              <div className="space-y-3">
                {accessItems.map((item) => {
                  const done = item.status === "done";
                  return (
                    <Solid key={item.id} className="!py-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[15px] font-bold">{item.label}</p>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => setCredential(item.id, "pending")}
                            className={`rounded-full px-3 py-1.5 text-[11px] font-bold disabled:opacity-60 ${
                              !done ? "bg-[#2c2e38] text-white" : "text-white/35"
                            }`}
                          >
                            {busyId === item.id ? "…" : "Pending"}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => setCredential(item.id, "done")}
                            className={`rounded-full px-3 py-1.5 text-[11px] font-bold disabled:opacity-60 ${
                              done ? "bg-[#B8FF3C] text-[#0b0c10]" : "text-white/35"
                            }`}
                          >
                            {busyId === item.id ? "…" : "Done"}
                          </button>
                        </div>
                      </div>
                    </Solid>
                  );
                })}
              </div>
            )
          ) : null}

          {tab === "calendar" ? (
            <>
              <div
                ref={listRef}
                onScroll={onListScroll}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-y border-[#22242c] bg-[#14161d]"
              >
                <div ref={pastRef}>
                  {pastDates.map((key) => (
                    <DayRow
                      key={key}
                      dateKey={key}
                      isToday={false}
                      items={itemsByDate.get(key) ?? []}
                      onOpen={() => openDay(key)}
                    />
                  ))}
                </div>
                <div>
                  {todayAndFuture.map((key) => (
                    <DayRow
                      key={key}
                      dateKey={key}
                      isToday={key === todayKey}
                      items={itemsByDate.get(key) ?? []}
                      onOpen={() => openDay(key)}
                    />
                  ))}
                </div>
              </div>

              {showJumpToday ? (
                <button
                  type="button"
                  aria-label="Jump to today"
                  title="Today"
                  onClick={() => pinToday(true)}
                  className="absolute bottom-24 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-[#B8FF3C] text-[#0b0c10] shadow-lg lg:bottom-8"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2.2" />
                    <path d="M3 10h18" stroke="currentColor" strokeWidth="2.2" />
                    <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    <circle cx="12" cy="15" r="1.6" fill="currentColor" />
                  </svg>
                </button>
              ) : null}
            </>
          ) : null}

          {tab === "todo" ? (
            !month && loading ? (
              <p className="text-[13px] font-semibold text-white/40">Loading…</p>
            ) : openTodos.length === 0 ? (
              <Solid>
                <p className="text-[14px] font-semibold text-white/45">No open todos.</p>
              </Solid>
            ) : (
              <div className="space-y-3">
                {openTodos.map((item) => {
                  const stages = stagesForKind(item.kind);
                  const idx = Math.max(0, stages.indexOf(item.stage));
                  const cat = categoryLabel(item.kind, item.category);
                  const nextLabel = nextStageLabel(item.kind, item.stage);
                  const menuOpen = todoMenuId === item.id;
                  const editOpen = todoEditId === item.id;
                  const kindTag =
                    item.kind === "shoot"
                      ? cat
                        ? `${cat} shoot`
                        : "Shoot"
                      : item.kind === "event"
                        ? cat || "Event"
                        : "Other";

                  return (
                    <Solid key={item.id} className="relative !p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#B8FF3C]/90">
                            {kindTag}
                          </p>
                          <p className="mt-1 text-[16px] font-bold leading-snug text-white">
                            {item.title}
                          </p>
                          <p className="mt-1 text-[12px] font-semibold text-white/40">{item.date}</p>
                        </div>
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            aria-label="More"
                            onClick={() =>
                              setTodoMenuId((id) => (id === item.id ? null : item.id))
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2c2e38] text-white/55"
                          >
                            ⋮
                          </button>
                          {menuOpen ? (
                            <div className="absolute right-0 top-9 z-20 min-w-[120px] overflow-hidden rounded-xl border border-[#2c2e38] bg-[#1a1c24] shadow-xl">
                              <button
                                type="button"
                                className="block w-full px-3 py-2.5 text-left text-[13px] font-bold text-white hover:bg-white/5"
                                onClick={() => {
                                  setTodoEditId(item.id);
                                  setTodoMenuId(null);
                                }}
                              >
                                Edit stage
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
                          Status
                        </p>
                        <p className="mt-1 text-[14px] font-extrabold text-white">
                          {stageLabel(item.stage, item.kind)}
                        </p>
                      </div>

                      <div className="mt-3 flex gap-1">
                        {stages.map((s, i) => (
                          <div
                            key={s}
                            className={`h-1 flex-1 rounded-full ${
                              i <= idx ? "bg-[#B8FF3C]" : "bg-[#2c2e38]"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="mt-1.5 flex justify-between gap-1 text-[9px] font-bold text-white/35">
                        {stages.map((s) => (
                          <span key={s} className="min-w-0 flex-1 truncate text-center">
                            {stageLabel(s, item.kind)}
                          </span>
                        ))}
                      </div>

                      {editOpen ? (
                        <div className="mt-4 rounded-xl border border-[#2c2e38] bg-[#0b0c10] p-3">
                          <p className="text-[11px] font-bold text-white/50">
                            Set stage — going back needs password
                          </p>
                          <div className="mt-2 flex flex-col gap-1.5">
                            {stages.map((s, i) => {
                              const current = s === item.stage;
                              const back = i < idx;
                              return (
                                <button
                                  key={s}
                                  type="button"
                                  disabled={busyId === item.id || current}
                                  onClick={() => requestStageChange(item, s)}
                                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] font-bold ${
                                    current
                                      ? "bg-[#B8FF3C] text-[#0b0c10]"
                                      : "border border-[#2c2e38] text-white/80 active:bg-white/5"
                                  }`}
                                >
                                  <span>{stageLabel(s, item.kind)}</span>
                                  <span className="text-[10px] font-bold opacity-60">
                                    {current ? "Now" : back ? "Back · lock" : "Forward"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={() => setTodoEditId(null)}
                            className="mt-2 w-full py-2 text-[12px] font-bold text-white/45"
                          >
                            Close edit
                          </button>
                        </div>
                      ) : nextLabel ? (
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => advanceItem(item.id)}
                          className="mt-4 flex min-h-11 w-full items-center justify-center rounded-full bg-[#B8FF3C] text-[13px] font-bold text-[#0b0c10] disabled:opacity-70"
                        >
                          {busyId === item.id ? "Updating…" : `Advance → ${nextLabel}`}
                        </button>
                      ) : null}
                    </Solid>
                  );
                })}
              </div>
            )
          ) : null}

          {tab === "budget" ? (
            !month ? (
              <p className="text-[13px] font-semibold text-white/40">Loading budget…</p>
            ) : (
              <>
                <Solid className="!py-3.5">
                  <div className="flex flex-wrap justify-between gap-2 text-[13px] font-bold">
                    <span className="text-white/45">
                      Added <span className="text-[#B8FF3C]">{inr(budget.added)}</span>
                    </span>
                    <span className="text-white/45">
                      Used <span className="text-[#F472B6]">{inr(budget.used)}</span>
                    </span>
                    <span className="text-white/45">
                      Left <span className="text-white">{inr(budget.remaining)}</span>
                    </span>
                  </div>
                </Solid>
                <Solid>
                  <p className="text-[13px] font-semibold text-white/45">
                    Tracker only — spend happens on Meta / Google / YouTube.
                  </p>
                  <form onSubmit={addBudget} className="mt-3 space-y-2.5">
                    <div className="flex gap-2">
                      <select
                        value={budgetType}
                        onChange={(e) => setBudgetType(e.target.value as "add" | "use")}
                        className="rounded-xl border border-[#2c2e38] bg-[#0b0c10] px-3 py-3 text-[13px] font-semibold"
                      >
                        <option value="add">Added</option>
                        <option value="use">Used</option>
                      </select>
                      <input
                        inputMode="decimal"
                        value={budgetAmount}
                        onChange={(e) => setBudgetAmount(e.target.value)}
                        placeholder="₹ amount"
                        className="flex-1 rounded-xl border border-[#2c2e38] bg-[#0b0c10] px-3 py-3 text-[13px] font-semibold outline-none"
                      />
                    </div>
                    <input
                      value={budgetNote}
                      onChange={(e) => setBudgetNote(e.target.value)}
                      placeholder="Note"
                      className="w-full rounded-xl border border-[#2c2e38] bg-[#0b0c10] px-3 py-3 text-[13px] font-semibold outline-none"
                    />
                    <button
                      type="submit"
                      disabled={busyId === "budget-new"}
                      className="flex min-h-11 w-full items-center justify-center rounded-full bg-[#B8FF3C] text-[13px] font-bold text-[#0b0c10] disabled:opacity-70"
                    >
                      {busyId === "budget-new" ? "Saving…" : "Add to log"}
                    </button>
                  </form>
                </Solid>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/35">Log</p>
                {month.budgetEntries.length === 0 ? (
                  <p className="text-[13px] font-semibold text-white/35">No entries yet.</p>
                ) : (
                  month.budgetEntries.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between border-b border-[#22242c] py-3 text-[14px]"
                    >
                      <span className="font-semibold text-white/60">
                        {e.note || (e.type === "add" ? "Added" : "Used")}
                      </span>
                      <span className={`font-bold ${e.type === "add" ? "text-[#B8FF3C]" : "text-[#F472B6]"}`}>
                        {e.type === "add" ? "+" : "−"}
                        {inr(e.amountInr)}
                      </span>
                    </div>
                  ))
                )}
              </>
            )
          ) : null}

          {tab === "plan" ? (
            <div className="space-y-4 pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
                  {TRIBECA_PLAN.eyebrow}
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-agency-display)] text-[1.45rem] font-bold leading-tight">
                  {TRIBECA_PLAN.title}
                </h2>
                <p className="mt-1.5 text-[13px] font-bold text-white/55">{TRIBECA_PLAN.oneLiner}</p>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                  {TRIBECA_PLAN.pathTitle}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {TRIBECA_PLAN.path.map((step, i) => (
                    <div
                      key={step.title}
                      className="rounded-2xl border border-[#2c2e38] bg-[#14161d] px-2.5 py-3 text-center"
                    >
                      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#B8FF3C]/15 text-[#B8FF3C]">
                        <PlanGlyph name={step.icon} />
                      </div>
                      <p className="mt-2 text-[11px] font-extrabold text-white">
                        {i + 1}. {step.title}
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold leading-snug text-white/45">{step.line}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                  {TRIBECA_PLAN.platformsTitle}
                </p>
                <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {TRIBECA_PLAN.platforms.map((p) => (
                    <div key={p.id} className="flex w-[4.25rem] shrink-0 flex-col items-center gap-1.5">
                      <PlanPlatformGlyph id={p.id} />
                      <span className="text-center text-[9px] font-bold leading-tight text-white/55">
                        {p.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                  {TRIBECA_PLAN.campaignsTitle}
                </p>
                <div className="overflow-hidden rounded-2xl border border-[#2c2e38] bg-[#14161d]">
                  <div className="grid grid-cols-[1.05fr_1.15fr_1.2fr] gap-2 border-b border-[#2c2e38] bg-[#1a1c24] px-3 py-2 text-[9px] font-extrabold uppercase tracking-wide text-white/40">
                    <span>Campaign</span>
                    <span>Focus</span>
                    <span>Channels</span>
                  </div>
                  {TRIBECA_PLAN.campaigns.map((c) => (
                    <div
                      key={c.name}
                      className="grid grid-cols-[1.05fr_1.15fr_1.2fr] gap-2 border-b border-[#22242c] px-3 py-2.5 last:border-b-0"
                    >
                      <p className="text-[12px] font-extrabold text-white">{c.name}</p>
                      <p className="text-[11px] font-semibold leading-snug text-white/50">{c.what}</p>
                      <p className="text-[11px] font-bold leading-snug text-white/70">{c.channels}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                  {TRIBECA_PLAN.alwaysTitle}
                </p>
                <p className="mb-2 text-[12px] font-semibold text-white/45">{TRIBECA_PLAN.alwaysLine}</p>
                <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {TRIBECA_PLAN.always.map((a) => (
                    <div
                      key={a.title}
                      className="min-w-[7.2rem] shrink-0 rounded-2xl border border-[#2c2e38] bg-[#14161d] px-3 py-2.5"
                    >
                      <p className="text-[12px] font-extrabold text-[#B8FF3C]">{a.title}</p>
                      <p className="mt-0.5 text-[11px] font-semibold leading-snug text-white/45">{a.line}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Solid className="!py-3.5 border-[#B8FF3C]/25">
                <div className="flex items-center gap-2 text-[#B8FF3C]">
                  <PlanGlyph name="note" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em]">{TRIBECA_PLAN.notesTitle}</p>
                </div>
                <div className="mt-2 space-y-1.5">
                  {TRIBECA_PLAN.notes.map((n, i) => (
                    <p
                      key={n}
                      className={`text-[12px] font-bold leading-snug ${
                        i === 1 ? "text-[#B8FF3C]" : "text-white/70"
                      }`}
                    >
                      {n}
                    </p>
                  ))}
                </div>
              </Solid>

              <div className="rounded-2xl border border-[#2c2e38] bg-[#14161d] px-3.5 py-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                  {TRIBECA_PLAN.bassikTitle}
                </p>
                <p className="mt-1 text-[12px] font-semibold text-white/55">{TRIBECA_PLAN.bassikLine}</p>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                  {TRIBECA_PLAN.leadershipTitle}
                </p>
                <div className="space-y-2">
                  {TRIBECA_PLAN.leadership.map((p) => (
                    <Solid key={p.name} className="!py-3.5">
                      <p className="text-[15px] font-extrabold text-white">{p.name}</p>
                      <p className="mt-0.5 text-[12px] font-bold text-[#B8FF3C]">{p.title}</p>
                      <p className="mt-2 text-[12px] font-semibold leading-relaxed text-white/55">{p.bio}</p>
                    </Solid>
                  ))}
                </div>
                <p className="mt-2 text-[12px] font-bold text-white/60">{TRIBECA_PLAN.leadershipLine}</p>
              </div>

              <div className="pt-2 text-center">
                <Link
                  href="/tribecacafe/discussions"
                  className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/35 underline-offset-4 hover:text-white/55 hover:underline"
                >
                  Discussion
                </Link>
              </div>
            </div>
          ) : null}

        </main>
      </div>

      {sheetDate && sheetMeta ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/75" onClick={closeSheet} />
          <div className="relative z-10 max-h-[82dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[1.75rem] border border-[#2c2e38] border-b-0 bg-[#14161d] px-5 pb-10 pt-3">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#3a3c48]" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
                  {sheetDate === todayKey ? "Today" : sheetMeta.weekday}
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-agency-display)] text-[1.4rem] font-bold">
                  {sheetMeta.label}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeSheet}
                className="rounded-full border border-[#2c2e38] px-3 py-1.5 text-[11px] font-bold text-white/45"
              >
                Close
              </button>
            </div>

            {sheetItems.length > 0 ? (
              <div className="mt-5">
                {sheetItems.map((item) => {
                  const cat = categoryLabel(item.kind, item.category);
                  const notesOpen = notesItemId === item.id;
                  const editOpen = editingId === item.id;
                  const editCats = item.kind === "event" ? EVENT_CATEGORIES : SHOOT_CATEGORIES;
                  return (
                    <div key={item.id} className="border-b border-[#22242c] py-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold uppercase text-white/35">
                            {item.kind === "shoot" && cat
                              ? `${cat} shoot`
                              : cat
                                ? `${item.kind} · ${cat}`
                                : item.kind}
                          </p>
                          <p className="mt-0.5 text-[15px] font-bold">{item.title}</p>
                          {!notesOpen && item.notes ? (
                            <p className="mt-1 line-clamp-2 text-[12px] font-semibold text-white/45">
                              {item.notes}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            aria-label="Edit"
                            title="Edit"
                            onClick={() => {
                              if (editOpen) {
                                setEditingId(null);
                                return;
                              }
                              startEditItem(item);
                            }}
                            className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                              editOpen
                                ? "border-[#B8FF3C]/50 text-[#B8FF3C]"
                                : "border-[#2c2e38] text-white/45"
                            }`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path
                                d="M4 20h4l10.5-10.5-4-4L4 16v4z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M12.5 6.5l4 4"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            aria-label="Notes"
                            title="Notes"
                            onClick={() => {
                              if (notesOpen) {
                                setNotesItemId(null);
                                return;
                              }
                              setNotesItemId(item.id);
                              setNotesDraft(item.notes || "");
                              setEditingId(null);
                            }}
                            className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                              notesOpen || item.notes
                                ? "border-[#B8FF3C]/50 text-[#B8FF3C]"
                                : "border-[#2c2e38] text-white/45"
                            }`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path
                                d="M5 4h11l3 3v13H5V4z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M8 10h8M8 14h6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                          <span
                            className="rounded-full px-2 py-1 text-[10px] font-bold"
                            style={{
                              background: `${KIND_COLOR[item.kind]}22`,
                              color: KIND_COLOR[item.kind],
                            }}
                          >
                            {stageLabel(item.stage, item.kind)}
                          </span>
                        </div>
                      </div>

                      {editOpen ? (
                        <div className="mt-2.5 space-y-2">
                          {(item.kind === "shoot" || item.kind === "event") && (
                            <div className="flex flex-wrap gap-1.5">
                              {editCats.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => setEditCategory(c.id)}
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                    editCategory === c.id
                                      ? "bg-white/15 text-white"
                                      : "border border-[#2c2e38] text-white/40"
                                  }`}
                                >
                                  {c.label}
                                </button>
                              ))}
                            </div>
                          )}
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full rounded-xl border border-[#2c2e38] bg-[#0b0c10] px-3 py-2.5 text-[13px] font-semibold outline-none"
                          />
                          <label className="block">
                            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
                              Change date
                            </span>
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="w-full rounded-xl border border-[#2c2e38] bg-[#0b0c10] px-3 py-2.5 text-[13px] font-semibold outline-none"
                            />
                          </label>
                          <button
                            type="button"
                            disabled={busyId === `edit-${item.id}`}
                            onClick={() => saveEditItem(item)}
                            className="flex min-h-9 w-full items-center justify-center rounded-full bg-[#B8FF3C] text-[12px] font-bold text-[#0b0c10] disabled:opacity-70"
                          >
                            {busyId === `edit-${item.id}` ? "Saving…" : "Save changes"}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === `del-${item.id}`}
                            onClick={() => void deleteCalendarItem(item)}
                            className="flex min-h-9 w-full items-center justify-center rounded-full border border-[#F472B6]/45 text-[12px] font-bold text-[#F472B6] disabled:opacity-70"
                          >
                            {busyId === `del-${item.id}` ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      ) : null}

                      {notesOpen ? (
                        <div className="mt-2.5 space-y-2">
                          <textarea
                            value={notesDraft}
                            onChange={(e) => setNotesDraft(e.target.value)}
                            rows={3}
                            placeholder="Shoot notes / content notes…"
                            className="w-full resize-none rounded-xl border border-[#2c2e38] bg-[#0b0c10] px-3 py-2.5 text-[13px] font-semibold text-white outline-none"
                          />
                          <button
                            type="button"
                            disabled={busyId === `notes-${item.id}`}
                            onClick={() => saveItemNotes(item.id)}
                            className="flex min-h-9 w-full items-center justify-center rounded-full bg-[#B8FF3C] text-[12px] font-bold text-[#0b0c10] disabled:opacity-70"
                          >
                            {busyId === `notes-${item.id}` ? "Saving…" : "Save notes"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {showAddForm ? (
              <form
                onSubmit={addCalendarItem}
                className="mt-5 space-y-2"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">Add</p>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: "shoot", label: "Shoot" },
                      { id: "event", label: "Event" },
                      { id: "other", label: "Other" },
                    ] as const
                  ).map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => {
                        setNewKind(k.id);
                        setNewCategory(
                          k.id === "event" ? EVENT_CATEGORIES[0].id : SHOOT_CATEGORIES[0].id
                        );
                      }}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                        newKind === k.id
                          ? "bg-[#B8FF3C] text-[#0b0c10]"
                          : "border border-[#2c2e38] text-white/55"
                      }`}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
                {newKind === "shoot" ? (
                  <div className="flex flex-wrap gap-1.5">
                    {SHOOT_CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setNewCategory(c.id)}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          newCategory === c.id
                            ? "bg-white/15 text-white"
                            : "border border-[#2c2e38] text-white/40"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                {newKind === "event" ? (
                  <div className="flex flex-wrap gap-1.5">
                    {EVENT_CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setNewCategory(c.id)}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          newCategory === c.id
                            ? "bg-white/15 text-white"
                            : "border border-[#2c2e38] text-white/40"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={
                    newKind === "event" ? "Event name" : newKind === "shoot" ? "Shoot title" : "Title"
                  }
                  className="w-full rounded-xl border border-[#2c2e38] bg-[#0b0c10] px-3 py-2.5 text-[13px] font-semibold outline-none"
                />
                <button
                  type="submit"
                  disabled={busyId === "cal-new"}
                  className="flex min-h-11 w-full items-center justify-center rounded-full bg-[#B8FF3C] text-[13px] font-bold text-[#0b0c10] disabled:opacity-70"
                >
                  {busyId === "cal-new" ? "Adding…" : "Add to log"}
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSheetAddMore(true);
                  setEditingId(null);
                  setNotesItemId(null);
                }}
                className="mt-6 flex min-h-11 w-full items-center justify-center rounded-full border border-[#B8FF3C]/50 bg-transparent text-[13px] font-bold text-[#B8FF3C]"
              >
                Add more
              </button>
            )}
          </div>
        </div>
      ) : null}

      {stageBackPrompt ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/75"
            onClick={() => {
              setStageBackPrompt(null);
              setStageBackPassword("");
              setStageBackError("");
            }}
          />
          <div className="relative z-10 w-full max-w-[400px] rounded-t-[1.5rem] border border-[#2c2e38] bg-[#14161d] px-5 pb-8 pt-4 sm:rounded-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#3a3c48] sm:hidden" />
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
              Move stage back
            </p>
            <h3 className="mt-1 font-[family-name:var(--font-agency-display)] text-[1.25rem] font-bold">
              Enter password
            </h3>
            <p className="mt-1 text-[12px] font-semibold text-white/45">
              Going to an earlier stage needs the stage password.
            </p>
            <input
              type="password"
              inputMode="numeric"
              value={stageBackPassword}
              onChange={(e) => {
                setStageBackPassword(e.target.value);
                setStageBackError("");
              }}
              placeholder="Password"
              className="mt-4 w-full rounded-xl border border-[#2c2e38] bg-[#0b0c10] px-3 py-3 text-[14px] font-semibold outline-none"
            />
            {stageBackError ? (
              <p className="mt-2 text-[12px] font-bold text-[#F472B6]">{stageBackError}</p>
            ) : null}
            <button
              type="button"
              className="mt-4 flex min-h-11 w-full items-center justify-center rounded-full bg-[#B8FF3C] text-[13px] font-bold text-[#0b0c10]"
              onClick={() => {
                const item = rangeItems.find((i) => i.id === stageBackPrompt.itemId);
                if (!item) return;
                void setItemStage(item, stageBackPrompt.targetStage, stageBackPassword.trim());
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#22242c] bg-[#0b0c10] px-2 py-2.5 lg:hidden">
        <div className="mx-auto flex max-w-[430px] gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                if (t.id === "calendar") pinnedOnce.current = false;
              }}
              className={`min-h-11 flex-1 rounded-full px-1 text-[11px] font-bold ${
                tab === t.id ? "bg-[#B8FF3C] text-[#0b0c10]" : "text-white/45"
              }`}
            >
              {t.label}
              {t.id === "todo" && openTodos.length ? ` ${openTodos.length}` : ""}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
