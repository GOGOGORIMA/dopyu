"use client";

import { Droplets, Hourglass, Repeat, type LucideIcon } from "lucide-react";
import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { computeStats } from "@/lib/analytics";
import { PromoCard } from "@/components/promo-card";
import { cn } from "@/lib/cn";
import { getCurrentUser, listEntries, useDb } from "@/lib/local-db";
import { useI18n } from "@/lib/i18n";
import { formatDuration } from "@/lib/i18n-dict";
import { formatCount, formatMl, LOCAL } from "@/lib/time";
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
  const { lang, t } = useI18n();
  const entries = useDb(() => {
    const user = getCurrentUser();
    return user ? listEntries(user.id) : [];
  });
  const stats = useMemo(
    // Personal analytics use the device's local time (getFullYear / getMonth / getDate / getHours)
    () => (entries && timeZone ? computeStats(entries, LOCAL) : null),
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
          label={t(`${stats.year}年の総回数`, `${stats.year} sessions`)}
          value={formatCount(summary.count)}
          unit={t("回", "x")}
          sub={
            summary.excludedCount > 0
              ? t(
                  `ランキング対象 ${formatCount(summary.rankableCount)}回 · 対象外 ${formatCount(summary.excludedCount)}回`,
                  `${formatCount(summary.rankableCount)} ranked · ${formatCount(summary.excludedCount)} My Page only`,
                )
              : t(`記録した日 ${formatCount(summary.activeDays)}日`, `${formatCount(summary.activeDays)} active days`)
          }
        />
        <StatTile
          icon={Droplets}
          accent="text-violet"
          label={t("推定総量", "Est. total volume")}
          value={formatMl(summary.totalVolumeMl)}
          unit="ml"
          sub={t("年齢区分による推定値の合計", "Sum of age-based estimates")}
        />
        <StatTile
          icon={Hourglass}
          accent="text-pink"
          label={t("平均所要時間", "Avg session time")}
          value={summary.averageDurationSeconds !== null ? formatDuration(summary.averageDurationSeconds, lang) : "—"}
          unit=""
          sub={
            summary.longestDurationSeconds !== null
              ? t(`最長 ${formatDuration(summary.longestDurationSeconds, "ja")}`, `Longest ${formatDuration(summary.longestDurationSeconds, "en")}`)
              : t("ストップウォッチの平均値", "Stopwatch average")
          }
        />
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <HourlyChart hourly={stats.hourly} />
        </Card>
        <Card className="lg:col-span-2">
          <TopTags tags={stats.topTags} />
          <PromoCard slot="okazu" className="mt-4 bg-bg/60" />
        </Card>
      </div>

      <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CalendarView timeZone={LOCAL} entries={entries} />
        </Card>
        <Card className="lg:col-span-2">
          <RecentEntries entries={entries} />
        </Card>
      </div>

      <p className="text-xs text-muted">
        {t(
          `集計は ${stats.year}年1月1日〜12月31日、お使いの端末のローカル時刻（${timeZone}）です。ランキングは世界共通の UTC 基準です。`,
          `Stats cover Jan 1 – Dec 31, ${stats.year} in your device's local time (${timeZone}). Rankings use UTC worldwide.`,
        )}
      </p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6" aria-busy="true" aria-label="Loading">
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
