/**
 * Time zone helpers that run on both the server and the client.
 * They rely only on the standard Intl API, with no extra libraries.
 * They work for zones with daylight saving time too (e.g. America/New_York).
 */

export const DEFAULT_TIME_ZONE = "Asia/Tokyo";

export type ZonedParts = {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
  /** 0-23 */
  hour: number;
  minute: number;
  second: number;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

export function isValidTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== "string" || timeZone.length === 0 || timeZone.length > 64) {
    return false;
  }
  try {
    getFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

export function resolveTimeZone(timeZone: unknown, fallback = DEFAULT_TIME_ZONE): string {
  return isValidTimeZone(timeZone) ? timeZone : fallback;
}

/** Splits an instant into calendar date and time-of-day parts as seen in the given time zone. */
export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts: Record<string, number> = {};
  for (const part of getFormatter(timeZone).formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour === 24 ? 0 : parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

/** The time zone's offset from UTC at the given instant, in milliseconds. */
function getOffsetMs(date: Date, timeZone: string): number {
  const p = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Converts a wall-clock date and time in the given time zone to a UTC instant. */
export function zonedTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day = 1,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const firstOffset = getOffsetMs(new Date(guess), timeZone);
  let result = guess - firstOffset;
  // Correct the result when it lands just before or after a DST switch.
  const secondOffset = getOffsetMs(new Date(result), timeZone);
  if (secondOffset !== firstOffset) {
    result = guess - secondOffset;
  }
  return new Date(result);
}

/** The year in the given time zone, as a half-open range [start, end). */
export function getYearRange(year: number, timeZone: string): { start: Date; end: Date } {
  return {
    start: zonedTimeToUtc(timeZone, year, 1, 1),
    end: zonedTimeToUtc(timeZone, year + 1, 1, 1),
  };
}

/** The month in the given time zone, as a half-open range [start, end). month is 1-12. */
export function getMonthRange(
  year: number,
  month: number,
  timeZone: string,
): { start: Date; end: Date } {
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return {
    start: zonedTimeToUtc(timeZone, year, month, 1),
    end: zonedTimeToUtc(timeZone, nextYear, nextMonth, 1),
  };
}

/** Number of days in the month (calendar arithmetic only, no time zone involved). */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Weekday of the 1st of the month (0 = Sunday). */
export function getFirstWeekday(year: number, month: number): number {
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
}

/** Seconds as "12:34" or "1:02:03". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Seconds as Japanese text, e.g. "12分34秒" or "1時間2分". */
export function formatDurationJa(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (hours > 0) return `${hours}時間${minutes}分`;
  if (minutes > 0) return `${minutes}分${String(seconds).padStart(2, "0")}秒`;
  return `${seconds}秒`;
}

/** Formats a millilitre value for display, e.g. 1234.5 -> "1,234.5". */
export function formatMl(value: number): string {
  return value.toLocaleString("ja-JP", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatCount(value: number): string {
  return value.toLocaleString("ja-JP");
}
