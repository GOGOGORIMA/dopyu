"use client";

import { Droplets, Hourglass, Repeat, type LucideIcon } from "lucide-react";
import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { computeStats } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { getCurrentUser, listEntries, useDb } from "@/lib/local-db";
import { formatCount, formatDurationJa, formatMl } from "@/lib/time";
import { CalendarView } from "./calendar-view";
import { HourlyChart } from "./hourly-chart";
import { RecentEntries } from "./recent-entries";
import { TopTags } from "./top-tags";

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-3xl border border-line bg-surface p-5", className)}>{children}</div>;
}

/** Stat tile: label, value, unit, and a sub line. Values use proportional figures. */
function StatTile({
  icon: Icon,
  label,
  value,
  unit,
  sub,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
  sub: ReactNode;
  accent: string;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
        <Icon className={cn("size-4", accent)} aria-hidden />
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        {value}
        <span className="ml-1 text-base font-semibold text-ink-2">{unit}</span>
      </p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </Card>
  );
}

const noopSubscribe = () => () => {};

/** The browser's IANA time zone (null on the server / during hydration). */
function useBrowserTimeZone(): string | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    () => null,
  );
}

export function MyDashboard() {
  // The browser's time zone sets the hour-of-day buckets and calendar dates
  const timeZone = useBrowserTimeZone();
  const entries = useDb(() => {
    const user = getCurrentUser();
    return user ? listEntries(user.id) : [];
  });
  const stats = useMemo(
    () => (entries && timeZone ? computeStats(entries, timeZone) : null),
    [entries, timeZone],
  );

  if (!stats || !entries || !timeZone) return <DashboardSkeleton />;

  const { summary } = stats;
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <StatTile
          icon={Repeat}
          accent="text-accent"
          label={`${stats.year}年の総回数`}
          value={formatCount(summary.count)}
          unit="回"
          sub={
            summary.excludedCount > 0
              ? `ランキング対象 ${formatCount(summary.rankableCount)}回 · 対象外 ${formatCount(summary.excludedCount)}回`
              : `記録した日 ${formatCount(summary.activeDays)}日`
          }
        />
        <StatTile
          icon={Droplets}
          accent="text-violet"
          label="推定総量"
          value={formatMl(summary.totalVolumeMl)}
          unit="ml"
          sub="年齢区分による推定値の合計"
        />
        <StatTile
          icon={Hourglass}
          accent="text-pink"
          label="平均所要時間"
          value={summary.averageDurationSeconds !== null ? formatDurationJa(summary.averageDurationSeconds) : "—"}
          unit=""
          sub={
            summary.longestDurationSeconds !== null
              ? `最長 ${formatDurationJa(summary.longestDurationSeconds)}`
              : "ストップウォッチの平均値"
          }
        />
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <HourlyChart hourly={stats.hourly} />
        </Card>
        <Card className="lg:col-span-2">
          <TopTags tags={stats.topTags} />
        </Card>
      </div>

      <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CalendarView timeZone={timeZone} entries={entries} />
        </Card>
        <Card className="lg:col-span-2">
          <RecentEntries entries={entries} />
        </Card>
      </div>

      <p className="text-xs text-muted">
        集計は {stats.year}年1月1日〜12月31日、お使いの端末のタイムゾーン（{stats.timeZone}）の時刻です。
      </p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6" aria-busy="true" aria-label="読み込み中">
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-3xl bg-surface" />
        ))}
      </div>
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-5">
        <div className="h-80 animate-pulse rounded-3xl bg-surface lg:col-span-3" />
        <div className="h-80 animate-pulse rounded-3xl bg-surface lg:col-span-2" />
      </div>
    </div>
  );
}
