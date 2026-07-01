"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { calendarMonthCells, calendarWeekdayLabels } from "@/lib/team-calendar";
import { toLocalDateString } from "@/lib/local-date";
import { IconCalendar } from "./TeamIcons";

function formatDisplayDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function parseViewFromValue(value: string): { year: number; month: number } {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m] = value.split("-").map(Number);
    return { year: y, month: m };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function TeamDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  clearable = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  clearable?: boolean;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const initial = parseViewFromValue(value);
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);

  const todayKey = toLocalDateString(new Date());
  const cells = useMemo(() => calendarMonthCells(viewYear, viewMonth), [viewYear, viewMonth]);
  const weekdays = calendarWeekdayLabels();

  useEffect(() => {
    if (!open) return;
    const next = parseViewFromValue(value);
    setViewYear(next.year);
    setViewMonth(next.month);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const goMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth() + 1);
  };

  const pick = (dateKey: string) => {
    onChange(dateKey);
    setOpen(false);
  };

  const calendar = (
    <div className="rounded-2xl border border-white/10 bg-[#12121a] p-3 shadow-2xl shadow-black/50">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goMonth(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-white/60 active:bg-white/[0.06]"
          aria-label="Previous month"
        >
          ‹
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-white/90">
          {monthLabel(viewYear, viewMonth)}
        </p>
        <button
          type="button"
          onClick={() => goMonth(1)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-white/60 active:bg-white/[0.06]"
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7">
        {weekdays.map((w) => (
          <div key={w} className="py-1 text-center text-[10px] font-semibold uppercase text-white/30">
            {w.slice(0, 3)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((dateKey, i) => {
          if (!dateKey) {
            return <div key={`pad-${i}`} className="aspect-square" />;
          }
          const isToday = dateKey === todayKey;
          const isSelected = dateKey === value;
          const dayNum = parseInt(dateKey.slice(8), 10);
          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => pick(dateKey)}
              className="flex aspect-square items-center justify-center"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium ${
                  isSelected
                    ? "bg-cyan-500 text-white"
                    : isToday
                      ? "bg-white/10 text-cyan-200"
                      : "text-white/80 active:bg-white/[0.08]"
                }`}
              >
                {dayNum}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => pick(todayKey)}
          className="min-h-[40px] flex-1 rounded-xl bg-white/[0.06] text-sm font-medium text-white/70"
        >
          Today
        </button>
        {clearable && value ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="min-h-[40px] rounded-xl border border-white/10 px-4 text-sm text-white/50"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-left text-base ${
          value ? "text-white" : "text-white/40"
        }`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="min-w-0 truncate">{value ? formatDisplayDate(value) : placeholder}</span>
        <IconCalendar className="h-5 w-5 shrink-0 text-white/35" />
      </button>
      {open ? (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/50 md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-x-3 bottom-3 z-[70] md:absolute md:inset-x-auto md:bottom-auto md:left-0 md:right-0 md:top-full md:mt-2 md:w-full md:min-w-[18rem] md:z-50">
            {calendar}
          </div>
        </>
      ) : null}
    </div>
  );
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => {
  const label = new Date(2000, 0, 1, h, 0).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return { value: String(h).padStart(2, "0"), label };
});

const MINUTE_OPTIONS = ["00", "15", "30", "45"];

export function TeamTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [hRaw, mRaw] = value && /^\d{2}:\d{2}$/.test(value) ? value.split(":") : ["12", "00"];
  const hour = HOUR_OPTIONS.some((o) => o.value === hRaw) ? hRaw : "12";
  const minute = MINUTE_OPTIONS.includes(mRaw) ? mRaw : "00";

  const setHour = (nextHour: string) => onChange(`${nextHour}:${minute}`);
  const setMinute = (nextMinute: string) => onChange(`${hour}:${nextMinute}`);

  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="block">
        <span className="mb-1 block text-[11px] text-white/40">Hour</span>
        <select
          value={hour}
          onChange={(e) => setHour(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white"
        >
          {HOUR_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] text-white/40">Minute</span>
        <select
          value={minute}
          onChange={(e) => setMinute(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white"
        >
          {MINUTE_OPTIONS.map((m) => (
            <option key={m} value={m}>
              :{m}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
