import { getZonedParts, zonedTimeToUtc } from "./time";
import { estimateVolumeMl, estimateVolumeMlByAge } from "./volume";
import { APP_TIME_ZONE } from "./time";
import type { LocalEntry } from "./local-db";
import { assignRankingInOrder } from "./ranking-rules";

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
  /**
   * When the user joined: a fixed date ("YYYY-MM-DD") or "N days ago" (relative, so that
   * newcomers this week / this month always exist whenever the demo is opened).
   */
  joined: string | { daysAgo: number };
};

export const DUMMY_USERS: DummyUser[] = [
  { username: "sakura_77", countryCode: "JP", timeZone: "Asia/Tokyo", birthDate: "2001-03-03", perWeek: 6, peakHour: 1, favoriteTags: ["アニメ", "同人誌", "漫画"], joined: "2024-04-01" },
  { username: "kenji_45", countryCode: "JP", timeZone: "Asia/Tokyo", birthDate: "1981-09-20", perWeek: 3, peakHour: 6, favoriteTags: ["グラビア", "写真集"], joined: "2023-11-15" },
  { username: "yuki_n", countryCode: "JP", timeZone: "Asia/Tokyo", birthDate: "1990-01-10", perWeek: 5, peakHour: 22, favoriteTags: ["官能小説", "妄想"], joined: "2025-02-10" },
  { username: "hiroshi_s", countryCode: "JP", timeZone: "Asia/Tokyo", birthDate: "1967-12-01", perWeek: 2, peakHour: 5, favoriteTags: ["写真集"], joined: "2024-01-20" },
  { username: "ren_19", countryCode: "JP", timeZone: "Asia/Tokyo", birthDate: "2007-02-14", perWeek: 8, peakHour: 0, favoriteTags: ["ゲーム", "アニメ"], joined: "2025-06-01" },
  { username: "nanashi", countryCode: "JP", timeZone: "Asia/Tokyo", birthDate: "1985-05-05", perWeek: 0, peakHour: 22, favoriteTags: [], joined: "2025-09-01" },
  { username: "eagle_mike", countryCode: "US", timeZone: "America/New_York", birthDate: "1993-07-04", perWeek: 5, peakHour: 23, favoriteTags: [], joined: "2024-08-08" },
  { username: "j_smith", countryCode: "US", timeZone: "America/Chicago", birthDate: "1962-03-30", perWeek: 2, peakHour: 21, favoriteTags: [], joined: "2023-12-01" },
  { username: "luna_ray", countryCode: "US", timeZone: "America/Los_Angeles", birthDate: "1999-10-31", perWeek: 4, peakHour: 0, favoriteTags: [], joined: { daysAgo: 60 } },
  { username: "minjun_kr", countryCode: "KR", timeZone: "Asia/Seoul", birthDate: "1997-08-15", perWeek: 6, peakHour: 1, favoriteTags: [], joined: "2024-10-10" },
  { username: "seoul_king", countryCode: "KR", timeZone: "Asia/Seoul", birthDate: "1984-11-11", perWeek: 3.5, peakHour: 23, favoriteTags: [], joined: "2025-12-20" },
  { username: "longwei", countryCode: "CN", timeZone: "Asia/Shanghai", birthDate: "1991-02-02", perWeek: 4, peakHour: 22, favoriteTags: [], joined: "2025-03-03" },
  { username: "carioca_br", countryCode: "BR", timeZone: "America/Sao_Paulo", birthDate: "2000-12-25", perWeek: 7, peakHour: 2, favoriteTags: [], joined: { daysAgo: 12 } },
  { username: "pedro_samba", countryCode: "BR", timeZone: "America/Sao_Paulo", birthDate: "1978-04-21", perWeek: 3, peakHour: 13, favoriteTags: [], joined: "2024-05-05" },
  { username: "hans_berlin", countryCode: "DE", timeZone: "Europe/Berlin", birthDate: "1974-10-03", perWeek: 2.5, peakHour: 7, favoriteTags: [], joined: "2023-09-01" },
  { username: "pierre_fr", countryCode: "FR", timeZone: "Europe/Paris", birthDate: "1987-07-14", perWeek: 3, peakHour: 23, favoriteTags: [], joined: "2025-07-14" },
  { username: "london_lad", countryCode: "GB", timeZone: "Europe/London", birthDate: "2003-06-02", perWeek: 5, peakHour: 0, favoriteTags: [], joined: { daysAgo: 2 } },
  { username: "raj_mumbai", countryCode: "IN", timeZone: "Asia/Kolkata", birthDate: "1996-01-26", perWeek: 4, peakHour: 22, favoriteTags: [], joined: "2025-01-26" },
  { username: "bangkok_boy", countryCode: "TH", timeZone: "Asia/Bangkok", birthDate: "1998-04-13", perWeek: 4.5, peakHour: 21, favoriteTags: [], joined: "2024-12-01" },
  { username: "aussie_dan", countryCode: "AU", timeZone: "Australia/Sydney", birthDate: "1982-01-26", perWeek: 3, peakHour: 6, favoriteTags: [], joined: { daysAgo: 150 } },
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

/** Every generated session from the local calendar date `from` up to `now`. */
function generateSessions(
  user: Pick<DummyUser, "username" | "timeZone" | "perWeek" | "peakHour" | "favoriteTags">,
  now: Date,
  from: { year: number; month: number; day: number },
): GeneratedSession[] {
  const local = getZonedParts(now, user.timeZone);
  const result: GeneratedSession[] = [];
  const cursor = new Date(Date.UTC(from.year, from.month - 1, from.day));
  const last = Date.UTC(local.year, local.month - 1, local.day);
  for (; cursor.getTime() <= last; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    for (const s of sessionsForDay(user as DummyUser, cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate())) {
      if (s.completedAt.getTime() <= now.getTime()) result.push(s);
    }
  }
  return result;
}

/** Join date as a local calendar date. */
function joinDate(user: DummyUser, now: Date) {
  if (typeof user.joined === "string") {
    const [year, month, day] = user.joined.split("-").map(Number);
    return { year, month, day };
  }
  const p = getZonedParts(new Date(now.getTime() - user.joined.daysAgo * 86_400_000), user.timeZone);
  return { year: p.year, month: p.month, day: p.day };
}

/** Age-based volume without time zone lookups (fast path for thousands of generated sessions). */
function quickVolumeMl(birth: Date, at: Date): number {
  let age = at.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    at.getUTCMonth() < birth.getUTCMonth() ||
    (at.getUTCMonth() === birth.getUTCMonth() && at.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return estimateVolumeMlByAge(age);
}

/** Preset icons for the built-in users (a couple have none, to show the default icon). */
const DUMMY_AVATARS: Record<string, string | null> = {
  sakura_77: "preset:cat",
  kenji_45: "preset:dog",
  yuki_n: "preset:unicorn",
  hiroshi_s: "preset:panda",
  ren_19: "preset:fire",
  nanashi: null,
  eagle_mike: "preset:alien",
  j_smith: null,
  luna_ray: "preset:ghost",
  minjun_kr: "preset:fox",
  seoul_king: "preset:octopus",
  longwei: "preset:panda",
  carioca_br: "preset:frog",
  pedro_samba: "preset:fire",
  hans_berlin: "preset:dog",
  pierre_fr: "preset:cat",
  london_lad: "preset:penguin",
  raj_mumbai: "preset:droplet",
  bangkok_boy: "preset:octopus",
  aussie_dan: "preset:fox",
};

/** A ranking participant: public profile + its ranked records (time and volume only). */
export type ParticipantSource = {
  username: string;
  avatar: string | null;
  countryCode: string;
  /** Join time (epoch ms): the denominator start for the per-day average */
  joinedAt: number;
  /** Ranked records (isRanked = true): completion time (epoch ms) and estimated volume (ml) */
  events: { t: number; v: number }[];
};

let participantCache: { key: number; value: ParticipantSource[] } | null = null;

/**
 * Every dummy user with their ranked records from the join date up to now
 * (same isRanked rules as real users). Cached per hour.
 */
export function getDummyParticipants(now: Date): ParticipantSource[] {
  const key = Math.floor(now.getTime() / 3_600_000);
  if (participantCache?.key === key) return participantCache.value;

  const value = DUMMY_USERS.map((user) => {
    const from = joinDate(user, now);
    const joinedAt = zonedTimeToUtc(user.timeZone, from.year, from.month, from.day).getTime();
    const birth = new Date(`${user.birthDate}T00:00:00.000Z`);
    const events =
      user.perWeek > 0
        ? assignRankingInOrder(generateSessions(user, now, from))
            .filter((s) => s.isRanked)
            .map((s) => ({ t: s.completedAt.getTime(), v: quickVolumeMl(birth, s.completedAt) }))
        : [];
    return {
      username: user.username,
      avatar: DUMMY_AVATARS[user.username] ?? null,
      countryCode: user.countryCode,
      joinedAt,
      events,
    };
  });
  participantCache = { key, value };
  return value;
}

/** Sample entries for the demo account: Jan 1 of the current year until now. */
export function generateDemoEntries(birthDate: Date, now: Date = new Date()): LocalEntry[] {
  const demo = {
    username: "dopyu_taro",
    timeZone: "Asia/Tokyo",
    perWeek: 4.5,
    peakHour: 23,
    favoriteTags: ["動画", "妄想", "ASMR", "漫画", "グラビア", "VR"],
  };
  const year = getZonedParts(now, APP_TIME_ZONE).year;
  return assignRankingInOrder(generateSessions(demo, now, { year, month: 1, day: 1 })).map((s, i) => ({
    id: `demo-${i}-${s.completedAt.getTime()}`,
    startTime: new Date(s.completedAt.getTime() - s.durationSeconds * 1000).toISOString(),
    completedAt: s.completedAt.toISOString(),
    durationSeconds: s.durationSeconds,
    volumeMl: estimateVolumeMl(birthDate, s.completedAt, APP_TIME_ZONE),
    isRanked: s.isRanked,
    rankExclusion: s.reason,
    // The demo account should satisfy the "at least one tag" rule too
    tags: s.tags.length > 0 ? s.tags : [demo.favoriteTags[i % demo.favoriteTags.length]],
  }));
}
