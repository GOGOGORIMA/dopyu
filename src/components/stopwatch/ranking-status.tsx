"use client";

import { Hourglass, ShieldCheck, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { RANKING_DAILY_LIMIT } from "@/lib/constants";
import { getCurrentUser, listEntries, useDb } from "@/lib/local-db";
import { getRankingStatus } from "@/lib/ranking-rules";

/**
 * Current time, refreshed every 15 s and whenever `refreshKey` changes
 * (e.g. right after an entry is saved). Never read during render.
 */
function useMinuteClock(refreshKey: unknown): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refreshKey]);
  return now;
}

/**
 * Badges on the stopwatch screen telling whether the next entry can count toward the ranking:
 * cooldown (30 min after the previous entry) and the 5-per-day limit.
 */
export function RankingStatusBadges() {
  const entries = useDb(() => {
    const user = getCurrentUser();
    return user ? listEntries(user.id) : [];
  });
  const now = useMinuteClock(entries);
  if (now === null || entries === null) return null;

  const status = getRankingStatus(entries, new Date(now));
  const cooldownMinutes = Math.ceil(status.cooldownRemainingSeconds / 60);

  return (
    <div className="mb-5 flex w-full max-w-sm flex-col gap-2" aria-live="polite">
      {status.cooldownRemainingSeconds > 0 && (
        <p className="flex items-start gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-2.5 text-xs leading-relaxed text-amber-200">
          <Hourglass className="mt-px size-4 shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold">現在クールダウン中（あと{cooldownMinutes}分）</strong>
            ：この記録はマイページにのみ保存されます
          </span>
        </p>
      )}
      {status.dailyLimitReached && (
        <p className="flex items-start gap-2 rounded-2xl border border-violet/30 bg-violet/10 px-3.5 py-2.5 text-xs leading-relaxed text-ink">
          <Trophy className="mt-px size-4 shrink-0 text-violet" aria-hidden />
          <span>
            <strong className="font-semibold">
              本日のランキング集計上限（{status.rankedToday}/{RANKING_DAILY_LIMIT}回）達成済み
            </strong>
            ：以降の記録はマイページにのみ保存されます
          </span>
        </p>
      )}
      {status.cooldownRemainingSeconds === 0 && !status.dailyLimitReached && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-ink-2">
          <ShieldCheck className="size-3.5 text-accent" aria-hidden />
          ランキング集計対象 · 本日 {status.rankedToday}/{RANKING_DAILY_LIMIT}回
        </p>
      )}
    </div>
  );
}
