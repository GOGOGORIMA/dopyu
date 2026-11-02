"use client";

import { CircleCheck, Flag, Pause, Play, RotateCcw, Trophy, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { PromoCard } from "@/components/promo-card";
import { XShareButton } from "@/components/share-button";
import { cn } from "@/lib/cn";
import { getCurrentUser, listEntries } from "@/lib/local-db";
import { recordShareText, xShareUrl } from "@/lib/share";
import { APP_TIME_ZONE, formatDurationJa, formatMl, getYearRange, getZonedParts } from "@/lib/time";
import { RankingStatusBadges, useRankingStatusNow } from "./ranking-status";
import { RecordDialog, type SavedEntryResult } from "./record-dialog";
import { getElapsedMs, stopwatch, useStopwatchState } from "./stopwatch-store";

/** Returns the current time once per animation frame while active (Date is never read during render). */
function useAnimationClock(active: boolean): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    let frame = requestAnimationFrame(function tick() {
      setNow(Date.now());
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);
  return now;
}

const RING_RADIUS = 132;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const STATUS_LABEL = {
  idle: "STANDBY",
  running: "計測中",
  paused: "一時停止中",
  finished: "記録待ち",
} as const;

type Toast = { ranked: boolean; detail: string; reason: string | null; shareUrl: string; short: boolean };

/** Endurance recommendation is shown when the measurement was shorter than this. */
const ENDURANCE_PROMO_SECONDS = 180;

export function StopwatchPanel() {
  const state = useStopwatchState();
  const running = state.status === "running";
  const now = useAnimationClock(running);
  const [toast, setToast] = useState<Toast | null>(null);

  // While running, use the frame time (it is null for the first frame, so show the stored value)
  const elapsedMs = running && now !== null ? getElapsedMs(state, now) : state.accumulatedMs;
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((elapsedMs % 1000) / 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  const mainDigits = hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
  const ringProgress = (elapsedMs % 60_000) / 60_000;

  const rankingStatus = useRankingStatusNow();

  function handleReset() {
    if (window.confirm("計測をリセットしますか？")) stopwatch.reset();
  }

  function handleSaved(result: SavedEntryResult) {
    stopwatch.reset();
    // This year's total (ranking time zone) for the share text
    const user = getCurrentUser();
    const now = new Date();
    const { start, end } = getYearRange(getZonedParts(now, APP_TIME_ZONE).year, APP_TIME_ZONE);
    const yearTotal = (user ? listEntries(user.id) : [])
      .filter((e) => {
        const t = new Date(e.completedAt).getTime();
        return t >= start.getTime() && t < end.getTime();
      })
      .reduce((sum, e) => sum + e.volumeMl, 0);
    const { entry } = result;
    setToast({
      ranked: entry.isRanked,
      detail: `推定 ${formatMl(entry.volumeMl)}ml を記録`,
      reason: result.exclusionLabel,
      shareUrl: xShareUrl(recordShareText(formatDurationJa(entry.durationSeconds), entry.volumeMl, yearTotal)),
      short: entry.durationSeconds < ENDURANCE_PROMO_SECONDS,
    });
  }

  const canFinish = state.status === "running" || state.status === "paused";

  return (
    <section aria-label="ストップウォッチ" className="flex flex-col items-center">
      <RankingStatusBadges />
      {/* Ring and time readout */}
      <div className="relative aspect-square w-full max-w-[19rem]">
        <svg viewBox="0 0 300 300" className="absolute inset-0 size-full -rotate-90" aria-hidden>
          <defs>
            <linearGradient id="ring-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="60%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
          </defs>
          <circle cx="150" cy="150" r={RING_RADIUS} fill="none" stroke="#23232f" strokeWidth="10" />
          <circle
            cx="150"
            cy="150"
            r={RING_RADIUS}
            fill="none"
            stroke="url(#ring-gradient)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - ringProgress)}
            className={cn(elapsedMs === 0 && "opacity-0")}
          />
        </svg>
        <div
          className={cn(
            "absolute inset-6 rounded-full transition-shadow duration-700",
            running && "shadow-[0_0_80px_-10px_rgb(34_211_238/0.45)]",
          )}
          aria-hidden
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "mb-2 rounded-full px-3 py-1 text-xs font-semibold tracking-widest",
              running ? "bg-accent/15 text-accent" : "bg-surface-2 text-muted",
            )}
          >
            {running && <span className="mr-1.5 inline-block size-1.5 animate-pulse rounded-full bg-accent align-middle" />}
            {STATUS_LABEL[state.status]}
          </span>
          <div
            className="font-mono text-[3.4rem] leading-none font-semibold tracking-tight tabular-nums sm:text-6xl"
            role="timer"
            aria-live="off"
            aria-label={`経過時間 ${hours}時間${minutes}分${seconds}秒`}
          >
            {mainDigits}
          </div>
          <div className="mt-1 font-mono text-xl text-ink-2 tabular-nums" aria-hidden>
            .{pad(centiseconds)}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-8 grid w-full max-w-sm grid-cols-3 items-center gap-3">
        <button
          type="button"
          onClick={handleReset}
          disabled={state.status !== "paused"}
          className="flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl border border-line bg-surface text-xs font-medium text-ink-2 transition hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-35"
        >
          <RotateCcw className="size-4.5" aria-hidden />
          リセット
        </button>

        {running ? (
          <button
            type="button"
            onClick={() => stopwatch.pause()}
            className="flex h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border border-line-strong bg-surface-3 text-sm font-semibold text-ink transition hover:bg-surface-2 active:scale-[0.97]"
          >
            <Pause className="size-5" fill="currentColor" aria-hidden />
            一時停止
          </button>
        ) : (
          <button
            type="button"
            onClick={() => stopwatch.start()}
            disabled={state.status === "finished"}
            className="flex h-16 flex-col items-center justify-center gap-0.5 rounded-2xl bg-accent text-sm font-bold text-accent-ink shadow-[0_8px_30px_-8px_rgb(34_211_238/0.7)] transition hover:brightness-110 active:scale-[0.97] disabled:opacity-40"
          >
            <Play className="size-5" fill="currentColor" aria-hidden />
            {state.status === "paused" ? "再開" : "開始"}
          </button>
        )}

        <button
          type="button"
          onClick={() => stopwatch.finish()}
          disabled={!canFinish}
          className="flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl bg-linear-to-br from-violet to-pink text-xs font-bold text-white shadow-[0_8px_30px_-10px_rgb(244_114_182/0.8)] transition hover:brightness-110 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-35 disabled:shadow-none"
        >
          <Flag className="size-4.5" aria-hidden />
          完了
        </button>
      </div>

      <p className="mt-5 max-w-sm text-center text-xs leading-relaxed text-muted">
        計測中にページを再読み込みしたりタブを閉じたりしても、計測は止まりません。
        <br />
        記録はすべてマイページに保存されます。ランキング集計の対象になるのは、計測120分以内・前回の記録から30分経過後・1日5回までの記録です。
      </p>

      {/* Recommendation: during the cooldown ("賢者タイム") vs. normal */}
      {rankingStatus && (
        <PromoCard
          slot={rankingStatus.cooldownRemainingSeconds > 0 ? "cooldown" : "okazu"}
          className="mt-6 max-w-sm"
        />
      )}

      {state.status === "finished" && state.finishedAt !== null && (
        <RecordDialog
          startedAt={state.startedAt ?? state.finishedAt - state.accumulatedMs - state.pausedMs}
          completedAt={state.finishedAt}
          durationSeconds={Math.floor(state.accumulatedMs / 1000)}
          pausedSeconds={Math.round(state.pausedMs / 1000)}
          onCancel={() => stopwatch.cancelFinish()}
          onSaved={handleSaved}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-sm animate-pop rounded-2xl border border-line-strong bg-surface-2/95 p-4 shadow-2xl shadow-black/50 backdrop-blur md:bottom-8"
        >
          <div className="flex items-start gap-3">
            {toast.ranked ? (
              <Trophy className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            ) : (
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-amber-300" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">記録しました！</p>
              {toast.ranked ? (
                <p className="mt-1 inline-flex rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-bold text-accent">
                  ランキング集計対象として登録
                </p>
              ) : (
                <p className="mt-1 flex items-start gap-1.5 text-xs font-semibold text-amber-300">
                  <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
                  マイページ専用として登録（理由：{toast.reason}）
                </p>
              )}
              <p className="mt-1 text-sm text-ink-2">{toast.detail}</p>
              <XShareButton href={toast.shareUrl} className="mt-3" />
              {toast.short && <PromoCard slot="endurance" className="mt-3 bg-bg/60" />}
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="-m-1 rounded-full p-1 text-muted hover:text-ink"
              aria-label="閉じる"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
