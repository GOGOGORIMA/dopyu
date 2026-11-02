"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Droplet } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { MyCalendar } from "@/lib/services/stats";
import { useJson } from "./hooks";

type CalendarResponse = MyCalendar & { today: { year: number; month: number; day: number } };

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function shiftMonth(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

const toParam = ({ year, month }: { year: number; month: number }) =>
  `${year}-${String(month).padStart(2, "0")}`;

/** Monthly calendar: days with entries get a stamp, plus a count badge when there are several. */
export function CalendarView({ timeZone, version }: { timeZone: string; version: number }) {
  const [month, setMonth] = useState<string | null>(null);
  const url = `/api/me/calendar?tz=${encodeURIComponent(timeZone)}${month ? `&month=${month}` : ""}`;
  const { data, loading, error } = useJson<CalendarResponse>(url, version);

  const isCurrentMonth = data ? data.year === data.today.year && data.month === data.today.month : true;
  const activeDays = data ? data.counts.filter((c) => c > 0).length : 0;

  return (
    <section aria-labelledby="calendar-title" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="calendar-title" className="flex items-center gap-1.5 font-semibold">
          <CalendarDays className="size-4 text-pink" aria-hidden />
          カレンダー
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => data && setMonth(toParam(shiftMonth(data.year, data.month, -1)))}
            disabled={!data}
            className="rounded-full p-1.5 text-ink-2 transition hover:bg-surface-2 hover:text-ink disabled:opacity-40"
            aria-label="前の月"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="min-w-[6.5rem] text-center text-sm font-semibold tabular-nums" aria-live="polite">
            {data ? `${data.year}年${data.month}月` : "　"}
          </span>
          <button
            type="button"
            onClick={() => data && setMonth(toParam(shiftMonth(data.year, data.month, 1)))}
            disabled={!data || isCurrentMonth}
            className="rounded-full p-1.5 text-ink-2 transition hover:bg-surface-2 hover:text-ink disabled:opacity-30"
            aria-label="次の月"
          >
            <ChevronRight className="size-5" />
          </button>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={() => setMonth(null)}
              className="ml-1 rounded-full border border-line px-2.5 py-1 text-xs text-ink-2 transition hover:text-ink"
            >
              今月
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      {!data ? (
        <div className="aspect-[7/6] animate-pulse rounded-2xl bg-surface-2" aria-hidden />
      ) : (
        // Keep the previous month visible at lower opacity while the next one loads (no layout jump)
        <div className={cn("transition-opacity", loading && "opacity-50")}>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className={cn("py-1", i === 0 && "text-pink/80", i === 6 && "text-accent/80")}>
                {w}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: data.firstWeekday }, (_, i) => (
              <div key={`blank-${i}`} aria-hidden />
            ))}
            {data.counts.map((count, index) => {
              const day = index + 1;
              const isToday = isCurrentMonth && day === data.today.day;
              const isFuture = isCurrentMonth && day > data.today.day;
              return (
                <div
                  key={day}
                  aria-label={`${data.month}月${day}日${count > 0 ? ` ${count}回` : ""}`}
                  className={cn(
                    "relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs",
                    count > 0 ? "bg-violet/10" : "bg-bg/50",
                    isToday && "ring-1 ring-accent",
                    isFuture && "opacity-40",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 left-1.5 text-[10px] tabular-nums",
                      count > 0 ? "text-ink-2" : "text-muted",
                      isToday && "font-bold text-accent",
                    )}
                  >
                    {day}
                  </span>
                  {count > 0 && (
                    <span className="mt-3 grid size-5 place-items-center rounded-full bg-linear-to-br from-accent via-violet to-pink text-bg shadow-[0_0_12px_-2px_rgb(167_139_250/0.8)] sm:mt-2 sm:size-7">
                      <Droplet className="size-3 sm:size-4" fill="currentColor" strokeWidth={2.5} aria-hidden />
                    </span>
                  )}
                  {count > 1 && (
                    <span className="absolute top-0.5 right-0.5 min-w-4 rounded-full bg-pink px-1 text-[10px] leading-4 font-bold text-bg tabular-nums">
                      {count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-ink-2">
            この月: <strong className="text-ink">{data.total}回</strong>（記録した日 {activeDays}日）
          </p>
        </div>
      )}
    </section>
  );
}
