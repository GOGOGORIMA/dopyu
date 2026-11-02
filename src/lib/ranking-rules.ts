import {
  RANKING_COOLDOWN_SECONDS,
  RANKING_DAILY_LIMIT,
  RANKING_MAX_DURATION_SECONDS,
} from "./constants";
import { APP_TIME_ZONE, getZonedParts } from "./time";

/**
 * Ranking eligibility rules (isRanked).
 *
 * Every valid entry is always saved and shown on My Page.
 * An entry counts toward the yearly / country rankings only when ALL of these hold:
 *   1. duration <= 120 min           (longer = forgotten stopwatch)
 *   2. not within 30 min after the previous entry finished (cooldown)
 *   3. fewer than 5 ranked entries already on that day (0:00-23:59, ranking time zone)
 * There is no minimum duration.
 */

export type RankingExclusionReason = "over_120min" | "cooldown" | "daily_limit";

export const EXCLUSION_LABEL: Record<RankingExclusionReason, string> = {
  over_120min: "120分超過",
  cooldown: "クールダウン中",
  daily_limit: "1日5回上限",
};

export type RankingDecision = { isRanked: boolean; reason: RankingExclusionReason | null };

type EntryLike = { completedAt: string | Date; isRanked: boolean };

const toMs = (value: string | Date) => (typeof value === "string" ? new Date(value).getTime() : value.getTime());

/** Calendar day key in the ranking time zone (the "day" for the 5-per-day limit). */
export function rankingDayKey(at: Date | string, timeZone: string = APP_TIME_ZONE): string {
  const p = getZonedParts(typeof at === "string" ? new Date(at) : at, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * Decides isRanked for a new entry.
 * `history` = the user's existing entries (any order); only entries completed before the new one matter.
 */
export function judgeRanking(
  history: readonly EntryLike[],
  completedAt: Date,
  durationSeconds: number,
  timeZone: string = APP_TIME_ZONE,
): RankingDecision {
  if (durationSeconds > RANKING_MAX_DURATION_SECONDS) return { isRanked: false, reason: "over_120min" };

  const end = completedAt.getTime();
  let previousEnd = -Infinity;
  let rankedToday = 0;
  const today = rankingDayKey(completedAt, timeZone);
  for (const e of history) {
    const t = toMs(e.completedAt);
    if (t > end) continue;
    if (t > previousEnd) previousEnd = t;
    if (e.isRanked && rankingDayKey(new Date(t), timeZone) === today) rankedToday += 1;
  }

  if (end - previousEnd <= RANKING_COOLDOWN_SECONDS * 1000) return { isRanked: false, reason: "cooldown" };
  if (rankedToday >= RANKING_DAILY_LIMIT) return { isRanked: false, reason: "daily_limit" };
  return { isRanked: true, reason: null };
}

/** Applies the rules in chronological order to entries that do not have a decision yet (dummy / demo data). */
export function assignRankingInOrder<T extends { completedAt: Date; durationSeconds: number }>(
  sessions: readonly T[],
  timeZone: string = APP_TIME_ZONE,
): (T & RankingDecision)[] {
  const sorted = [...sessions].sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());
  const decided: (T & RankingDecision)[] = [];
  let previousEnd = -Infinity;
  const rankedPerDay = new Map<string, number>();
  for (const s of sorted) {
    const end = s.completedAt.getTime();
    const day = rankingDayKey(s.completedAt, timeZone);
    let decision: RankingDecision;
    if (s.durationSeconds > RANKING_MAX_DURATION_SECONDS) decision = { isRanked: false, reason: "over_120min" };
    else if (end - previousEnd <= RANKING_COOLDOWN_SECONDS * 1000) decision = { isRanked: false, reason: "cooldown" };
    else if ((rankedPerDay.get(day) ?? 0) >= RANKING_DAILY_LIMIT) decision = { isRanked: false, reason: "daily_limit" };
    else decision = { isRanked: true, reason: null };
    if (decision.isRanked) rankedPerDay.set(day, (rankedPerDay.get(day) ?? 0) + 1);
    previousEnd = end;
    decided.push({ ...s, ...decision });
  }
  return decided;
}

/** Live status for the stopwatch screen: cooldown remaining and today's ranked count. */
export type RankingStatus = {
  cooldownRemainingSeconds: number;
  rankedToday: number;
  dailyLimitReached: boolean;
};

export function getRankingStatus(
  history: readonly EntryLike[],
  now: Date,
  timeZone: string = APP_TIME_ZONE,
): RankingStatus {
  let lastEnd = -Infinity;
  let rankedToday = 0;
  const today = rankingDayKey(now, timeZone);
  for (const e of history) {
    const t = toMs(e.completedAt);
    if (t > lastEnd) lastEnd = t;
    if (e.isRanked && rankingDayKey(new Date(t), timeZone) === today) rankedToday += 1;
  }
  const cooldownEndsAt = lastEnd + RANKING_COOLDOWN_SECONDS * 1000;
  return {
    cooldownRemainingSeconds: Math.max(0, Math.ceil((cooldownEndsAt - now.getTime()) / 1000)),
    rankedToday,
    dailyLimitReached: rankedToday >= RANKING_DAILY_LIMIT,
  };
}
