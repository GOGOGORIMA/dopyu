import { APP_TIME_ZONE, getZonedParts, zonedTimeToUtc } from "./time";

/**
 * Ranking periods. All boundaries are 00:00 in the ranking time zone (APP_TIME_ZONE, default Asia/Tokyo).
 *   all   : every record ever (no reset)
 *   year  : Jan 1 00:00 of this year  -> now   (resets Jan 1)
 *   month : day 1 00:00 of this month -> now   (resets on the 1st)
 *   week  : Monday 00:00 of this week -> now   (resets every Monday 00:00)
 */
export const RANKING_PERIODS = ["all", "year", "month", "week"] as const;
export type RankingPeriodKey = (typeof RANKING_PERIODS)[number];

export const PERIOD_LABEL: Record<RankingPeriodKey, string> = {
  all: "歴代",
  year: "年間",
  month: "月間",
  week: "週間",
};

export type PeriodRange = {
  key: RankingPeriodKey;
  /** Inclusive start (null for "all") */
  start: Date | null;
  /** When this period resets next (null for "all") */
  nextReset: Date | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Adds days to a calendar date (pure calendar arithmetic, no time zone). */
function addDays(year: number, month: number, day: number, days: number) {
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Monday of the week containing the given calendar date. */
export function mondayOf(year: number, month: number, day: number) {
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = Sunday
  // Days since Monday: Mon 0, Tue 1, ..., Sat 5, Sun 6 (Sunday belongs to the week that began 6 days earlier)
  const sinceMonday = (weekday + 6) % 7;
  return addDays(year, month, day, -sinceMonday);
}

export function getPeriodRange(
  key: RankingPeriodKey,
  now: Date = new Date(),
  timeZone: string = APP_TIME_ZONE,
): PeriodRange {
  const today = getZonedParts(now, timeZone);
  switch (key) {
    case "all":
      return { key, start: null, nextReset: null };
    case "year":
      return {
        key,
        start: zonedTimeToUtc(timeZone, today.year, 1, 1),
        nextReset: zonedTimeToUtc(timeZone, today.year + 1, 1, 1),
      };
    case "month": {
      const next = today.month === 12 ? { y: today.year + 1, m: 1 } : { y: today.year, m: today.month + 1 };
      return {
        key,
        start: zonedTimeToUtc(timeZone, today.year, today.month, 1),
        nextReset: zonedTimeToUtc(timeZone, next.y, next.m, 1),
      };
    }
    case "week": {
      const monday = mondayOf(today.year, today.month, today.day);
      const nextMonday = addDays(monday.year, monday.month, monday.day, 7);
      return {
        key,
        start: zonedTimeToUtc(timeZone, monday.year, monday.month, monday.day),
        nextReset: zonedTimeToUtc(timeZone, nextMonday.year, nextMonday.month, nextMonday.day),
      };
    }
  }
}

/** "あと3日5時間" / "あと5時間12分" (the time left until the next reset). */
export function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `あと${days}日${hours}時間`;
  if (hours > 0) return `あと${hours}時間${minutes}分`;
  return `あと${minutes}分`;
}

/** Whole days between two instants, at least 1 (used for the per-day average). */
export function elapsedDays(fromMs: number, toMs: number): number {
  return Math.max(1, Math.ceil((toMs - fromMs) / DAY_MS));
}
