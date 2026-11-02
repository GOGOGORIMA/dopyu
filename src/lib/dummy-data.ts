import { getDaysInMonth, getZonedParts, zonedTimeToUtc } from "./time";
import { estimateVolumeMl } from "./volume";
import { APP_TIME_ZONE } from "./time";
import type { LocalEntry } from "./local-db";

/**
 * Built-in dummy users for the ranking (replaces the former Prisma seed).
 * Entries are generated deterministically from a seeded PRNG (same result for the same user and day),
 * so every visitor sees the same ranking without a server.
 */

type DummyUser = {
  username: string;
  countryCode: string;
  timeZone: string;
  birthDate: string;
  /** Average sessions per week (0 means a member with no entries) */
  perWeek: number;
  peakHour: number;
  favoriteTags: string[];
};

export const DUMMY_USERS: DummyUser[] = [
  { username: "sakura_77", countryCode: "JP", timeZone: "Asia/Tokyo", birthDate: "2001-03-03", perWeek: 6, peakHour: 1, favoriteTags: ["アニメ", "同人誌", "漫画"] },
  { username: "kenji_45", countryCode: "JP", timeZone: "Asia/Tokyo", birthDate: "1981-09-20", perWeek: 3, peakHour: 6, favoriteTags: ["グラビア", "写真集"] },
  { username: "yuki_n", countryCode: "JP", timeZone: "Asia/Tokyo", birthDate: "1990-01-10", perWeek: 5, peakHour: 22, favoriteTags: ["官能小説", "妄想"] },
  { username: "hiroshi_s", countryCode: "JP", timeZone: "Asia/Tokyo", birthDate: "1967-12-01", perWeek: 2, peakHour: 5, favoriteTags: ["写真集"] },
  { username: "ren_19", countryCode: "JP", timeZone: "Asia/Tokyo", birthDate: "2007-02-14", perWeek: 8, peakHour: 0, favoriteTags: ["ゲーム", "アニメ"] },
  { username: "nanashi", countryCode: "JP", timeZone: "Asia/Tokyo", birthDate: "1985-05-05", perWeek: 0, peakHour: 22, favoriteTags: [] },
  { username: "eagle_mike", countryCode: "US", timeZone: "America/New_York", birthDate: "1993-07-04", perWeek: 5, peakHour: 23, favoriteTags: [] },
  { username: "j_smith", countryCode: "US", timeZone: "America/Chicago", birthDate: "1962-03-30", perWeek: 2, peakHour: 21, favoriteTags: [] },
  { username: "luna_ray", countryCode: "US", timeZone: "America/Los_Angeles", birthDate: "1999-10-31", perWeek: 4, peakHour: 0, favoriteTags: [] },
  { username: "minjun_kr", countryCode: "KR", timeZone: "Asia/Seoul", birthDate: "1997-08-15", perWeek: 6, peakHour: 1, favoriteTags: [] },
  { username: "seoul_king", countryCode: "KR", timeZone: "Asia/Seoul", birthDate: "1984-11-11", perWeek: 3.5, peakHour: 23, favoriteTags: [] },
  { username: "longwei", countryCode: "CN", timeZone: "Asia/Shanghai", birthDate: "1991-02-02", perWeek: 4, peakHour: 22, favoriteTags: [] },
  { username: "carioca_br", countryCode: "BR", timeZone: "America/Sao_Paulo", birthDate: "2000-12-25", perWeek: 7, peakHour: 2, favoriteTags: [] },
  { username: "pedro_samba", countryCode: "BR", timeZone: "America/Sao_Paulo", birthDate: "1978-04-21", perWeek: 3, peakHour: 13, favoriteTags: [] },
  { username: "hans_berlin", countryCode: "DE", timeZone: "Europe/Berlin", birthDate: "1974-10-03", perWeek: 2.5, peakHour: 7, favoriteTags: [] },
  { username: "pierre_fr", countryCode: "FR", timeZone: "Europe/Paris", birthDate: "1987-07-14", perWeek: 3, peakHour: 23, favoriteTags: [] },
  { username: "london_lad", countryCode: "GB", timeZone: "Europe/London", birthDate: "2003-06-02", perWeek: 5, peakHour: 0, favoriteTags: [] },
  { username: "raj_mumbai", countryCode: "IN", timeZone: "Asia/Kolkata", birthDate: "1996-01-26", perWeek: 4, peakHour: 22, favoriteTags: [] },
  { username: "bangkok_boy", countryCode: "TH", timeZone: "Asia/Bangkok", birthDate: "1998-04-13", perWeek: 4.5, peakHour: 21, favoriteTags: [] },
  { username: "aussie_dan", countryCode: "AU", timeZone: "Australia/Sydney", birthDate: "1982-01-26", perWeek: 3, peakHour: 6, favoriteTags: [] },
];

// ---------------------------------------------------------------------------
// Deterministic randomness
// ---------------------------------------------------------------------------
function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASE_HOUR_WEIGHTS = [5, 3, 1.5, 0.7, 0.4, 0.5, 1.2, 1.8, 1, 0.8, 0.8, 1, 1.4, 1, 0.8, 0.9, 1.1, 1.4, 1.8, 2.4, 3.2, 4.6, 6, 6.5];

type GeneratedSession = { completedAt: Date; durationSeconds: number; tags: string[] };

/** Sessions for one user on one local calendar day (same output for the same inputs). */
function sessionsForDay(user: DummyUser, year: number, month: number, day: number): GeneratedSession[] {
  const random = mulberry32(hashString(`${user.username}:${year}-${month}-${day}`));
  // Poisson(perWeek / 7)
  const limit = Math.exp(-user.perWeek / 7);
  let count = 0;
  for (let p = random(); p > limit; p *= random()) count += 1;

  const weights = BASE_HOUR_WEIGHTS.map((base, hour) => {
    const raw = Math.abs(hour - user.peakHour);
    const distance = Math.min(raw, 24 - raw);
    return base + 7 * Math.exp(-(distance * distance) / 3);
  });
  const total = weights.reduce((s, w) => s + w, 0);

  const sessions: GeneratedSession[] = [];
  for (let i = 0; i < count; i += 1) {
    let r = random() * total;
    let hour = 23;
    for (let h = 0; h < 24; h += 1) {
      r -= weights[h];
      if (r <= 0) {
        hour = h;
        break;
      }
    }
    const short = random() < 0.025;
    // Log-normal around 9 minutes (Box-Muller)
    const g = Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
    const durationSeconds = short
      ? 3 + Math.floor(random() * 7)
      : Math.round(Math.min(Math.max(Math.exp(Math.log(540) + 0.55 * g), 60), 3600));
    const tags = user.favoriteTags.filter(() => random() < 0.45);
    sessions.push({
      completedAt: zonedTimeToUtc(user.timeZone, year, month, day, hour, Math.floor(random() * 60), Math.floor(random() * 60)),
      durationSeconds,
      tags,
    });
  }
  return sessions;
}

/** Every generated session from Jan 1 of `year - extraPrevMonths` up to `now`. */
function generateSessions(user: DummyUser, now: Date, fromYear: number, fromMonth: number): GeneratedSession[] {
  const local = getZonedParts(now, user.timeZone);
  const result: GeneratedSession[] = [];
  for (let year = fromYear; year <= local.year; year += 1) {
    const firstMonth = year === fromYear ? fromMonth : 1;
    const lastMonth = year === local.year ? local.month : 12;
    for (let month = firstMonth; month <= lastMonth; month += 1) {
      const lastDay = year === local.year && month === local.month ? local.day : getDaysInMonth(year, month);
      for (let day = 1; day <= lastDay; day += 1) {
        for (const s of sessionsForDay(user, year, month, day)) {
          if (s.completedAt.getTime() <= now.getTime()) result.push(s);
        }
      }
    }
  }
  return result;
}

export type RankingSource = {
  username: string;
  countryCode: string;
  count: number;
  totalVolumeMl: number;
};

const aggregateCache = new Map<string, RankingSource[]>();

/** Ranked (>= 10 s) count and total volume of every dummy user within [start, end). */
export function getDummyAggregates(start: Date, end: Date, now: Date): RankingSource[] {
  // Cache per hour: generated data only grows as time passes
  const cacheKey = `${start.toISOString()}|${Math.floor(now.getTime() / 3_600_000)}`;
  const cached = aggregateCache.get(cacheKey);
  if (cached) return cached;

  const startParts = getZonedParts(start, "UTC");
  const result = DUMMY_USERS.map((user) => {
    const birth = new Date(`${user.birthDate}T00:00:00.000Z`);
    let count = 0;
    let totalVolumeMl = 0;
    if (user.perWeek > 0) {
      // Start one month early so time-zone edges around Jan 1 are covered
      const fromYear = startParts.month === 1 ? startParts.year - 1 : startParts.year;
      const fromMonth = startParts.month === 1 ? 12 : startParts.month - 1;
      for (const s of generateSessions(user, now, fromYear, fromMonth)) {
        const t = s.completedAt.getTime();
        if (t < start.getTime() || t >= end.getTime() || s.durationSeconds < 10) continue;
        count += 1;
        totalVolumeMl += estimateVolumeMl(birth, s.completedAt, APP_TIME_ZONE);
      }
    }
    return { username: user.username, countryCode: user.countryCode, count, totalVolumeMl };
  });
  aggregateCache.set(cacheKey, result);
  return result;
}

/** Sample entries for the demo account: Jan 1 of the current year until now. */
export function generateDemoEntries(birthDate: Date, now: Date = new Date()): LocalEntry[] {
  const demo: DummyUser = {
    username: "dopyu_taro",
    countryCode: "JP",
    timeZone: "Asia/Tokyo",
    birthDate: birthDate.toISOString().slice(0, 10),
    perWeek: 4.5,
    peakHour: 23,
    favoriteTags: ["動画", "妄想", "ASMR", "漫画", "グラビア", "VR"],
  };
  const year = getZonedParts(now, APP_TIME_ZONE).year;
  return generateSessions(demo, now, year, 1).map((s, i) => ({
    id: `demo-${i}-${s.completedAt.getTime()}`,
    completedAt: s.completedAt.toISOString(),
    durationSeconds: s.durationSeconds,
    volumeMl: estimateVolumeMl(birthDate, s.completedAt, APP_TIME_ZONE),
    isRankable: s.durationSeconds >= 10,
    tags: s.tags,
  }));
}
