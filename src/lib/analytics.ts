import type { LocalEntry } from "./local-db";
import { getDaysInMonth, getFirstWeekday, getMonthRange, getYearRange, getZonedParts } from "./time";

/** My Page aggregation (computed in the browser from the user's own entries). */

export type MyStats = {
  year: number;
  timeZone: string;
  summary: {
    count: number;
    rankableCount: number;
    excludedCount: number;
    totalVolumeMl: number;
    averageDurationSeconds: number | null;
    longestDurationSeconds: number | null;
    activeDays: number;
  };
  hourly: { hour: number; count: number }[];
  topTags: { name: string; count: number }[];
};

export function computeStats(entries: LocalEntry[], timeZone: string, now: Date = new Date()): MyStats {
  const year = getZonedParts(now, timeZone).year;
  const { start, end } = getYearRange(year, timeZone);
  const inYear = entries.filter((e) => {
    const t = new Date(e.completedAt).getTime();
    return t >= start.getTime() && t < end.getTime();
  });

  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  const tagCounts = new Map<string, number>();
  const days = new Set<string>();
  let rankableCount = 0;
  let totalVolume = 0;
  let totalDuration = 0;
  let longest = 0;
  for (const e of inYear) {
    const parts = getZonedParts(new Date(e.completedAt), timeZone);
    hourly[parts.hour].count += 1;
    days.add(`${parts.month}-${parts.day}`);
    if (e.isRankable) rankableCount += 1;
    totalVolume += e.volumeMl;
    totalDuration += e.durationSeconds;
    longest = Math.max(longest, e.durationSeconds);
    for (const tag of e.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }

  const count = inYear.length;
  return {
    year,
    timeZone,
    summary: {
      count,
      rankableCount,
      excludedCount: count - rankableCount,
      totalVolumeMl: Math.round(totalVolume * 10) / 10,
      averageDurationSeconds: count > 0 ? Math.round(totalDuration / count) : null,
      longestDurationSeconds: count > 0 ? longest : null,
      activeDays: days.size,
    },
    hourly,
    topTags: [...tagCounts]
      .map(([name, c]) => ({ name, count: c }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ja"))
      .slice(0, 10),
  };
}

export type MyCalendar = {
  year: number;
  month: number;
  daysInMonth: number;
  firstWeekday: number;
  counts: number[];
  total: number;
};

export function computeCalendar(entries: LocalEntry[], timeZone: string, year: number, month: number): MyCalendar {
  const { start, end } = getMonthRange(year, month, timeZone);
  const daysInMonth = getDaysInMonth(year, month);
  const counts = Array.from({ length: daysInMonth }, () => 0);
  let total = 0;
  for (const e of entries) {
    const d = new Date(e.completedAt);
    if (d.getTime() < start.getTime() || d.getTime() >= end.getTime()) continue;
    counts[getZonedParts(d, timeZone).day - 1] += 1;
    total += 1;
  }
  return { year, month, daysInMonth, firstWeekday: getFirstWeekday(year, month), counts, total };
}

/** Today's calendar date in the given time zone. */
export function todayIn(timeZone: string): { year: number; month: number; day: number } {
  const { year, month, day } = getZonedParts(new Date(), timeZone);
  return { year, month, day };
}
