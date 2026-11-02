import "server-only";
import { prisma } from "@/lib/prisma";
import {
  getDaysInMonth,
  getFirstWeekday,
  getMonthRange,
  getYearRange,
  getZonedParts,
} from "@/lib/time";

/**
 * Personal analytics (My Page) aggregation. Only ever returns the requesting user's own data.
 * Hours of day and calendar dates use the time zone of the viewer's browser.
 */

export type MyStats = {
  year: number;
  timeZone: string;
  summary: {
    /** Number of entries this year (including ones excluded from rankings) */
    count: number;
    /** Entries counted in rankings */
    rankableCount: number;
    /** Entries excluded from rankings (under 10 seconds) */
    excludedCount: number;
    totalVolumeMl: number;
    averageDurationSeconds: number | null;
    longestDurationSeconds: number | null;
    /** Number of days with at least one entry */
    activeDays: number;
  };
  /** Count per hour, 0-23 */
  hourly: { hour: number; count: number }[];
  /** Tags used most often (top 10) */
  topTags: { name: string; count: number }[];
};

export async function getMyStats(
  userId: string,
  timeZone: string,
  now: Date = new Date(),
): Promise<MyStats> {
  const year = getZonedParts(now, timeZone).year;
  const { start, end } = getYearRange(year, timeZone);
  const entries = await prisma.entry.findMany({
    where: { userId, completedAt: { gte: start, lt: end } },
    select: {
      completedAt: true,
      durationSeconds: true,
      volumeMl: true,
      isRankable: true,
      tags: { select: { tag: { select: { name: true } } } },
    },
  });

  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  const tagCounts = new Map<string, number>();
  const days = new Set<string>();
  let rankableCount = 0;
  let totalVolume = 0;
  let totalDuration = 0;
  let longest = 0;

  for (const entry of entries) {
    const parts = getZonedParts(entry.completedAt, timeZone);
    hourly[parts.hour].count += 1;
    days.add(`${parts.month}-${parts.day}`);
    if (entry.isRankable) rankableCount += 1;
    totalVolume += entry.volumeMl;
    totalDuration += entry.durationSeconds;
    longest = Math.max(longest, entry.durationSeconds);
    for (const { tag } of entry.tags) {
      tagCounts.set(tag.name, (tagCounts.get(tag.name) ?? 0) + 1);
    }
  }

  const topTags = [...tagCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ja"))
    .slice(0, 10);

  const count = entries.length;
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
    topTags,
  };
}

export type MyCalendar = {
  year: number;
  /** 1-12 */
  month: number;
  timeZone: string;
  daysInMonth: number;
  /** Weekday of the 1st (0 = Sunday) */
  firstWeekday: number;
  /** Count per day: index 0 is the 1st */
  counts: number[];
  total: number;
};

export async function getMyCalendar(
  userId: string,
  timeZone: string,
  year: number,
  month: number,
): Promise<MyCalendar> {
  const { start, end } = getMonthRange(year, month, timeZone);
  const entries = await prisma.entry.findMany({
    where: { userId, completedAt: { gte: start, lt: end } },
    select: { completedAt: true },
  });

  const daysInMonth = getDaysInMonth(year, month);
  const counts = Array.from({ length: daysInMonth }, () => 0);
  for (const entry of entries) {
    const { day } = getZonedParts(entry.completedAt, timeZone);
    counts[day - 1] += 1;
  }

  return {
    year,
    month,
    timeZone,
    daysInMonth,
    firstWeekday: getFirstWeekday(year, month),
    counts,
    total: entries.length,
  };
}
