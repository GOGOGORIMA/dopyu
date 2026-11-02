import { getCountryName } from "./countries";
import { getDummyAggregates, type RankingSource } from "./dummy-data";
import { listEntries, listUsers, type LocalUser } from "./local-db";
import { APP_TIME_ZONE, getYearRange, getZonedParts } from "./time";
import type { WorldCupSort } from "./validation";

/**
 * Yearly ranking = built-in dummy users + accounts stored in this browser.
 *
 * Privacy: only aggregates (count and total volume) leave this module.
 * The row types are a whitelist; tags and completion times are never included.
 */

export type RankingPeriod = { year: number; timeZone: string; startDate: string; endDate: string };

export type UserRankingRow = {
  rank: number;
  username: string;
  /** Public icon ("preset:<id>" / data URL / null) */
  avatar: string | null;
  countryCode: string;
  countryName: string;
  count: number;
  totalVolumeMl: number;
  isMe: boolean;
};

export type UserRanking = {
  type: "japan" | "world";
  period: RankingPeriod;
  participantCount: number;
  rows: UserRankingRow[];
  me: UserRankingRow | null;
};

export type CountryRankingRow = {
  rank: number;
  countryCode: string;
  countryName: string;
  memberCount: number;
  activeMemberCount: number;
  count: number;
  totalVolumeMl: number;
  /** Total count / affiliated users (including users with no entries) */
  averageCount: number;
  /** Average estimated volume per affiliated user (ml) = total volume / memberCount */
  averageVolumeMl: number;
  isMyCountry: boolean;
};

export type CountryRanking = {
  type: "worldcup";
  sort: WorldCupSort;
  period: RankingPeriod;
  rows: CountryRankingRow[];
};

const round1 = (v: number) => Math.round(v * 10) / 10;

function getPeriod(now: Date): { period: RankingPeriod; start: Date; end: Date } {
  const year = getZonedParts(now, APP_TIME_ZONE).year;
  const { start, end } = getYearRange(year, APP_TIME_ZONE);
  return {
    period: { year, timeZone: APP_TIME_ZONE, startDate: `${year}-01-01`, endDate: `${year}-12-31` },
    start,
    end,
  };
}

type Source = RankingSource & { isMe: boolean };

/** Every participant (dummy + local accounts), including those with zero entries. */
function collectSources(viewer: LocalUser | null, start: Date, end: Date, now: Date): Source[] {
  const dummies = getDummyAggregates(start, end, now).map((d) => ({ ...d, isMe: false }));
  const locals = listUsers().map((user) => {
    let count = 0;
    let totalVolumeMl = 0;
    for (const e of listEntries(user.id)) {
      const t = new Date(e.completedAt).getTime();
      if (!e.isRanked || t < start.getTime() || t >= end.getTime()) continue;
      count += 1;
      totalVolumeMl += e.volumeMl;
    }
    return {
      username: user.username,
      avatar: user.avatar ?? null,
      countryCode: user.countryCode,
      count,
      totalVolumeMl,
      isMe: user.id === viewer?.id,
    };
  });
  return [...dummies, ...locals].map((s) => ({ ...s, totalVolumeMl: round1(s.totalVolumeMl) }));
}

function withRanks<T>(sorted: T[], isTie: (a: T, b: T) => boolean): (T & { rank: number })[] {
  let rank = 0;
  return sorted.map((item, i) => {
    if (i === 0 || !isTie(sorted[i - 1], item)) rank = i + 1;
    return { ...item, rank };
  });
}

export function computeUserRanking(
  type: "japan" | "world",
  viewer: LocalUser | null,
  now: Date = new Date(),
  limit = 100,
): UserRanking {
  const { period, start, end } = getPeriod(now);
  const participants = collectSources(viewer, start, end, now)
    .filter((s) => s.count > 0 && (type === "world" || s.countryCode === "JP"))
    .sort((a, b) => b.count - a.count || b.totalVolumeMl - a.totalVolumeMl || a.username.localeCompare(b.username));
  const ranked = withRanks(participants, (a, b) => a.count === b.count && a.totalVolumeMl === b.totalVolumeMl);
  const rows: UserRankingRow[] = ranked.map((r) => ({
    rank: r.rank,
    username: r.username,
    avatar: r.avatar,
    countryCode: r.countryCode,
    countryName: getCountryName(r.countryCode),
    count: r.count,
    totalVolumeMl: r.totalVolumeMl,
    isMe: r.isMe,
  }));
  return {
    type,
    period,
    participantCount: rows.length,
    rows: rows.slice(0, limit),
    me: rows.find((r) => r.isMe) ?? null,
  };
}

export function computeCountryRanking(sort: WorldCupSort, viewer: LocalUser | null, now: Date = new Date()): CountryRanking {
  const { period, start, end } = getPeriod(now);
  const byCountry = new Map<string, { memberCount: number; activeMemberCount: number; count: number; totalVolumeMl: number }>();
  for (const s of collectSources(viewer, start, end, now)) {
    const c = byCountry.get(s.countryCode) ?? { memberCount: 0, activeMemberCount: 0, count: 0, totalVolumeMl: 0 };
    c.memberCount += 1;
    if (s.count > 0) c.activeMemberCount += 1;
    c.count += s.count;
    c.totalVolumeMl += s.totalVolumeMl;
    byCountry.set(s.countryCode, c);
  }
  const rows = [...byCountry].map(([countryCode, c]) => ({
    countryCode,
    ...c,
    totalVolumeMl: round1(c.totalVolumeMl),
    averageCount: c.memberCount > 0 ? c.count / c.memberCount : 0,
    averageVolumeMl: c.memberCount > 0 ? c.totalVolumeMl / c.memberCount : 0,
  }));
  type Row = (typeof rows)[number];
  // "volume" (default): total estimated volume of the country. "average": average volume per member.
  const primary = (r: Row) => (sort === "average" ? r.averageVolumeMl : r.totalVolumeMl);
  const secondary = (r: Row) => (sort === "average" ? r.totalVolumeMl : r.averageVolumeMl);
  rows.sort((a, b) => primary(b) - primary(a) || secondary(b) - secondary(a) || a.countryCode.localeCompare(b.countryCode));
  const ranked = withRanks(rows, (a, b) => primary(a) === primary(b) && secondary(a) === secondary(b));
  return {
    type: "worldcup",
    sort,
    period,
    rows: ranked.map((r) => ({
      rank: r.rank,
      countryCode: r.countryCode,
      countryName: getCountryName(r.countryCode),
      memberCount: r.memberCount,
      activeMemberCount: r.activeMemberCount,
      count: r.count,
      totalVolumeMl: r.totalVolumeMl,
      averageCount: round1(r.averageCount),
      averageVolumeMl: round1(r.averageVolumeMl),
      isMyCountry: r.countryCode === viewer?.countryCode,
    })),
  };
}
