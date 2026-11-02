import "server-only";
import { APP_TIME_ZONE } from "@/lib/config";
import { getCountryName } from "@/lib/countries";
import { prisma } from "@/lib/prisma";
import { getYearRange, getZonedParts } from "@/lib/time";
import type { WorldCupSort } from "@/lib/validation";

/**
 * Yearly ranking aggregation.
 *
 * Privacy: this module only ever reads aggregates (count and total volume).
 * Tag names, completion times, durations and user IDs never leave it.
 * The return types (DTOs) are a whitelist; nothing else is returned.
 */

export type RankingPeriod = {
  year: number;
  timeZone: string;
  /** First day of the period (YYYY-MM-DD) */
  startDate: string;
  /** Last day of the period (YYYY-MM-DD, inclusive) */
  endDate: string;
};

export type UserRankingRow = {
  rank: number;
  username: string;
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
  /** The viewer's own row (also returned when outside the top N). null if not ranked. */
  me: UserRankingRow | null;
};

export type CountryRankingRow = {
  rank: number;
  countryCode: string;
  countryName: string;
  /** Number of users affiliated with the country */
  memberCount: number;
  /** Members with at least one ranked entry this year */
  activeMemberCount: number;
  count: number;
  totalVolumeMl: number;
  /** Average count per affiliated user (total count / memberCount) */
  averageCount: number;
  isMyCountry: boolean;
};

export type CountryRanking = {
  type: "worldcup";
  sort: WorldCupSort;
  period: RankingPeriod;
  rows: CountryRankingRow[];
};

type UserAggregate = {
  userId: string;
  username: string;
  countryCode: string;
  count: number;
  totalVolumeMl: number;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

export function getCurrentRankingYear(now: Date = new Date()): number {
  return getZonedParts(now, APP_TIME_ZONE).year;
}

export function getRankingPeriod(year: number): RankingPeriod {
  return {
    year,
    timeZone: APP_TIME_ZONE,
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
}

/** Each user's count and total volume of ranked entries in the year. */
async function aggregateByUser(year: number, countryCode?: string): Promise<UserAggregate[]> {
  const { start, end } = getYearRange(year, APP_TIME_ZONE);
  const grouped = await prisma.entry.groupBy({
    by: ["userId"],
    where: {
      isRankable: true,
      completedAt: { gte: start, lt: end },
      ...(countryCode ? { user: { countryCode } } : {}),
    },
    _count: { _all: true },
    _sum: { volumeMl: true },
  });
  if (grouped.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.userId) } },
    select: { id: true, username: true, countryCode: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  return grouped.flatMap((g) => {
    const user = userById.get(g.userId);
    if (!user) return [];
    return [
      {
        userId: g.userId,
        username: user.username,
        countryCode: user.countryCode,
        count: g._count._all,
        totalVolumeMl: round1(g._sum.volumeMl ?? 0),
      },
    ];
  });
}

/** Competition ranking (1, 2, 2, 4...): rows equal under `isTie` share a rank. */
function withRanks<T>(sorted: T[], isTie: (a: T, b: T) => boolean): (T & { rank: number })[] {
  let rank = 0;
  return sorted.map((item, index) => {
    if (index === 0 || !isTie(sorted[index - 1], item)) rank = index + 1;
    return { ...item, rank };
  });
}

export async function getUserRanking(options: {
  type: "japan" | "world";
  viewerId: string | null;
  year?: number;
  limit?: number;
}): Promise<UserRanking> {
  const year = options.year ?? getCurrentRankingYear();
  const limit = options.limit ?? 100;
  const aggregates = await aggregateByUser(year, options.type === "japan" ? "JP" : undefined);

  // Count first, then total volume. Username breaks remaining ties so the order is stable.
  aggregates.sort(
    (a, b) =>
      b.count - a.count ||
      b.totalVolumeMl - a.totalVolumeMl ||
      a.username.localeCompare(b.username),
  );
  const ranked = withRanks(
    aggregates,
    (a, b) => a.count === b.count && a.totalVolumeMl === b.totalVolumeMl,
  );

  // Copy only whitelisted fields; userId is dropped here.
  const toRow = (r: (typeof ranked)[number]): UserRankingRow => ({
    rank: r.rank,
    username: r.username,
    countryCode: r.countryCode,
    countryName: getCountryName(r.countryCode),
    count: r.count,
    totalVolumeMl: r.totalVolumeMl,
    isMe: options.viewerId !== null && r.userId === options.viewerId,
  });

  const mine = options.viewerId ? ranked.find((r) => r.userId === options.viewerId) : undefined;

  return {
    type: options.type,
    period: getRankingPeriod(year),
    participantCount: ranked.length,
    rows: ranked.slice(0, limit).map(toRow),
    me: mine ? toRow(mine) : null,
  };
}

export async function getCountryRanking(options: {
  sort: WorldCupSort;
  viewerCountryCode: string | null;
  year?: number;
}): Promise<CountryRanking> {
  const year = options.year ?? getCurrentRankingYear();
  const [memberGroups, aggregates] = await Promise.all([
    prisma.user.groupBy({ by: ["countryCode"], _count: { _all: true } }),
    aggregateByUser(year),
  ]);

  const byCountry = new Map<
    string,
    { memberCount: number; activeMemberCount: number; count: number; totalVolumeMl: number }
  >();
  for (const group of memberGroups) {
    byCountry.set(group.countryCode, {
      memberCount: group._count._all,
      activeMemberCount: 0,
      count: 0,
      totalVolumeMl: 0,
    });
  }
  for (const agg of aggregates) {
    const country = byCountry.get(agg.countryCode);
    if (!country) continue;
    country.activeMemberCount += 1;
    country.count += agg.count;
    country.totalVolumeMl += agg.totalVolumeMl;
  }

  const rows = [...byCountry.entries()].map(([countryCode, c]) => ({
    countryCode,
    memberCount: c.memberCount,
    activeMemberCount: c.activeMemberCount,
    count: c.count,
    totalVolumeMl: round1(c.totalVolumeMl),
    averageCount: c.memberCount > 0 ? c.count / c.memberCount : 0,
  }));

  type Row = (typeof rows)[number];
  const primary = (r: Row) => (options.sort === "average" ? r.averageCount : r.totalVolumeMl);
  const secondary = (r: Row) => (options.sort === "average" ? r.count : r.averageCount);

  rows.sort(
    (a, b) =>
      primary(b) - primary(a) ||
      secondary(b) - secondary(a) ||
      a.countryCode.localeCompare(b.countryCode),
  );
  const ranked = withRanks(rows, (a, b) => primary(a) === primary(b) && secondary(a) === secondary(b));

  return {
    type: "worldcup",
    sort: options.sort,
    period: getRankingPeriod(year),
    rows: ranked.map((r) => ({
      rank: r.rank,
      countryCode: r.countryCode,
      countryName: getCountryName(r.countryCode),
      memberCount: r.memberCount,
      activeMemberCount: r.activeMemberCount,
      count: r.count,
      totalVolumeMl: r.totalVolumeMl,
      averageCount: round1(r.averageCount),
      isMyCountry: r.countryCode === options.viewerCountryCode,
    })),
  };
}
