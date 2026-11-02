import { getCountryName } from "./countries";
import { getDummyParticipants, type ParticipantSource } from "./dummy-data";
import { listEntries, listUsers, type LocalUser } from "./local-db";
import { elapsedDays, getPeriodRange, type RankingPeriodKey } from "./ranking-period";
import { APP_TIME_ZONE } from "./time";

/**
 * Rankings = built-in dummy users + accounts stored in this browser.
 * Period: all-time / year / month / week (Monday 00:00 reset).
 * Metric (sort): total volume (default) / average / total count.
 *
 * Privacy: only aggregates leave this module; tags and record times are never included.
 */

export const RANKING_METRICS = ["volume", "average", "count"] as const;
export type RankingMetric = (typeof RANKING_METRICS)[number];

export const METRIC_LABEL: Record<RankingMetric, string> = { volume: "総量", average: "平均", count: "総回数" };

export type PeriodInfo = {
  key: RankingPeriodKey;
  timeZone: string;
  /** ISO start (null for all-time) */
  start: string | null;
  /** ISO next reset (null for all-time) */
  nextReset: string | null;
};

/** How far the viewer (or their country) is behind the next higher rank. */
export type GapToNext = { rank: number; gap: number } | null;

export type UserRankingRow = {
  rank: number;
  username: string;
  avatar: string | null;
  countryCode: string;
  countryName: string;
  count: number;
  totalVolumeMl: number;
  /** Average volume per day (ml/日) since max(period start, join date), at least 1 day */
  averagePerDayMl: number;
  /** Value of the selected metric */
  score: number;
  isMe: boolean;
};

export type UserRanking = {
  type: "japan" | "world";
  metric: RankingMetric;
  period: PeriodInfo;
  participantCount: number;
  rows: UserRankingRow[];
  /** The viewer's row (null = no ranked record in the period, or not eligible for this ranking) */
  me: UserRankingRow | null;
  gapToNext: GapToNext;
  /** false when the viewer cannot appear here (Japan ranking, non-JP user) */
  viewerEligible: boolean;
};

export type CountryRankingRow = {
  rank: number;
  countryCode: string;
  countryName: string;
  /** Users affiliated with the country */
  memberCount: number;
  /** Members with at least one ranked record in the period */
  activeMemberCount: number;
  count: number;
  totalVolumeMl: number;
  /** Average volume per participating user (ml/人) = total volume / active members */
  averageVolumeMl: number;
  score: number;
  isMyCountry: boolean;
};

export type CountryRanking = {
  type: "worldcup";
  metric: RankingMetric;
  period: PeriodInfo;
  rows: CountryRankingRow[];
  mine: CountryRankingRow | null;
  gapToNext: GapToNext;
};

const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;

type Participant = ParticipantSource & { isMe: boolean };

/** Dummy users + every account in this browser (with its ranked records). */
function collectParticipants(viewer: LocalUser | null, now: Date): Participant[] {
  const dummies = getDummyParticipants(now).map((d) => ({ ...d, isMe: false }));
  const locals = listUsers().map((user) => {
    const entries = listEntries(user.id);
    const events = entries
      .filter((e) => e.isRanked)
      .map((e) => ({ t: new Date(e.completedAt).getTime(), v: e.volumeMl }));
    // Join = account creation, or the first record if it is earlier (e.g. demo data)
    const firstRecord = Math.min(...entries.map((e) => new Date(e.completedAt).getTime()));
    const joinedAt = Math.min(new Date(user.createdAt).getTime(), Number.isFinite(firstRecord) ? firstRecord : Infinity);
    return {
      username: user.username,
      avatar: user.avatar ?? null,
      countryCode: user.countryCode,
      joinedAt,
      events,
      isMe: user.id === viewer?.id,
    };
  });
  return [...dummies, ...locals];
}

type Aggregate = Participant & { count: number; totalVolumeMl: number; averagePerDayMl: number };

function aggregate(p: Participant, start: Date | null, now: Date): Aggregate {
  const from = start ? start.getTime() : -Infinity;
  const to = now.getTime();
  let count = 0;
  let volume = 0;
  for (const e of p.events) {
    if (e.t < from || e.t > to) continue;
    count += 1;
    volume += e.v;
  }
  // Per-day average: divide by days since the later of (period start, join date), at least 1 day,
  // so people who joined mid-period compete on their daily pace.
  const denominatorStart = Math.max(start ? start.getTime() : p.joinedAt, p.joinedAt);
  return {
    ...p,
    count,
    totalVolumeMl: round1(volume),
    averagePerDayMl: round2(volume / elapsedDays(denominatorStart, to)),
  };
}

function periodInfo(key: RankingPeriodKey, now: Date): { info: PeriodInfo; start: Date | null } {
  const range = getPeriodRange(key, now, APP_TIME_ZONE);
  return {
    start: range.start,
    info: {
      key,
      timeZone: APP_TIME_ZONE,
      start: range.start?.toISOString() ?? null,
      nextReset: range.nextReset?.toISOString() ?? null,
    },
  };
}

/** Competition ranking on `score` (equal score = same rank, e.g. 1, 2, 2, 4). */
function withRanks<T extends { score: number }>(sorted: T[]): (T & { rank: number })[] {
  let rank = 0;
  return sorted.map((item, i) => {
    if (i === 0 || sorted[i - 1].score !== item.score) rank = i + 1;
    return { ...item, rank };
  });
}

/** Gap from `mine` to the nearest row with a higher score. */
function gapToNext<T extends { rank: number; score: number }>(rows: T[], mine: T | null, precision: number): GapToNext {
  if (!mine) return null;
  const above = rows.filter((r) => r.score > mine.score);
  if (above.length === 0) return null;
  const next = above[above.length - 1];
  const factor = 10 ** precision;
  return { rank: next.rank, gap: Math.round((next.score - mine.score) * factor) / factor };
}

export function metricPrecision(metric: RankingMetric, scope: "user" | "country"): number {
  if (metric === "count") return 0;
  return metric === "average" && scope === "user" ? 2 : 1;
}

export function computeUserRanking(
  type: "japan" | "world",
  metric: RankingMetric,
  periodKey: RankingPeriodKey,
  viewer: LocalUser | null,
  now: Date = new Date(),
  limit = 100,
): UserRanking {
  const { info, start } = periodInfo(periodKey, now);
  const scoreOf = (a: Aggregate) =>
    metric === "volume" ? a.totalVolumeMl : metric === "average" ? a.averagePerDayMl : a.count;

  const sorted = collectParticipants(viewer, now)
    .filter((p) => type === "world" || p.countryCode === "JP")
    .map((p) => aggregate(p, start, now))
    // Only people with at least one ranked record in the period take part
    .filter((a) => a.count > 0)
    .map((a) => ({ ...a, score: scoreOf(a) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.totalVolumeMl - a.totalVolumeMl ||
        b.count - a.count ||
        a.username.localeCompare(b.username),
    );

  const rows: UserRankingRow[] = withRanks(sorted).map((r) => ({
    rank: r.rank,
    username: r.username,
    avatar: r.avatar,
    countryCode: r.countryCode,
    countryName: getCountryName(r.countryCode),
    count: r.count,
    totalVolumeMl: r.totalVolumeMl,
    averagePerDayMl: r.averagePerDayMl,
    score: r.score,
    isMe: r.isMe,
  }));
  const me = rows.find((r) => r.isMe) ?? null;
  return {
    type,
    metric,
    period: info,
    participantCount: rows.length,
    rows: rows.slice(0, limit),
    me,
    gapToNext: gapToNext(rows, me, metricPrecision(metric, "user")),
    viewerEligible: viewer !== null && (type === "world" || viewer.countryCode === "JP"),
  };
}

export function computeCountryRanking(
  metric: RankingMetric,
  periodKey: RankingPeriodKey,
  viewer: LocalUser | null,
  now: Date = new Date(),
): CountryRanking {
  const { info, start } = periodInfo(periodKey, now);
  const byCountry = new Map<string, { memberCount: number; activeMemberCount: number; count: number; totalVolumeMl: number }>();
  for (const a of collectParticipants(viewer, now).map((p) => aggregate(p, start, now))) {
    const c = byCountry.get(a.countryCode) ?? { memberCount: 0, activeMemberCount: 0, count: 0, totalVolumeMl: 0 };
    c.memberCount += 1;
    if (a.count > 0) c.activeMemberCount += 1;
    c.count += a.count;
    c.totalVolumeMl += a.totalVolumeMl;
    byCountry.set(a.countryCode, c);
  }

  const sorted = [...byCountry]
    .map(([countryCode, c]) => {
      const totalVolumeMl = round1(c.totalVolumeMl);
      const averageVolumeMl = c.activeMemberCount > 0 ? round1(c.totalVolumeMl / c.activeMemberCount) : 0;
      const score = metric === "volume" ? totalVolumeMl : metric === "average" ? averageVolumeMl : c.count;
      return { countryCode, ...c, totalVolumeMl, averageVolumeMl, score };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.totalVolumeMl - a.totalVolumeMl ||
        b.count - a.count ||
        a.countryCode.localeCompare(b.countryCode),
    );

  const rows: CountryRankingRow[] = withRanks(sorted).map((r) => ({
    rank: r.rank,
    countryCode: r.countryCode,
    countryName: getCountryName(r.countryCode),
    memberCount: r.memberCount,
    activeMemberCount: r.activeMemberCount,
    count: r.count,
    totalVolumeMl: r.totalVolumeMl,
    averageVolumeMl: r.averageVolumeMl,
    score: r.score,
    isMyCountry: r.countryCode === viewer?.countryCode,
  }));
  const mine = rows.find((r) => r.isMyCountry) ?? null;
  return {
    type: "worldcup",
    metric,
    period: info,
    rows,
    mine,
    gapToNext: gapToNext(rows, mine, metricPrecision(metric, "country")),
  };
}
