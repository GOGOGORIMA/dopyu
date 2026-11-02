"use client";

import { ArrowDownWideNarrow, CalendarDays, Earth, Info, Lock, RotateCcw, Trophy, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { getCountryName } from "@/lib/countries";
import { getCurrentUser, useDb } from "@/lib/local-db";
import { computeCountryRanking, computeUserRanking, METRIC_LABEL, RANKING_METRICS, type PeriodInfo, type RankingMetric } from "@/lib/ranking";
import { formatCountdown, PERIOD_LABEL, RANKING_PERIODS, type RankingPeriodKey } from "@/lib/ranking-period";
import type { RankingType } from "@/lib/validation";
import { CountryRankingView } from "./country-ranking";
import { MyRankBar } from "./my-rank-bar";
import { UserRankingView } from "./user-ranking";

const TABS: { type: RankingType; label: string; flag?: string; icon?: LucideIcon }[] = [
  { type: "japan", label: "日本", flag: "jp" },
  { type: "world", label: "世界", icon: Earth },
  { type: "worldcup", label: "ワールドカップ", icon: Trophy },
];

/** Current time refreshed every 30 s (never read during render). */
function useClock(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);
  return now;
}

/** 3-way toggle switch: 総量 (default) / 平均 / 総回数, with a sliding indicator. */
function MetricSwitch({ metric, onChange }: { metric: RankingMetric; onChange: (m: RankingMetric) => void }) {
  const index = RANKING_METRICS.indexOf(metric);
  return (
    <div role="radiogroup" aria-label="並び替え" className="relative grid grid-cols-3 rounded-full border border-line bg-surface p-1">
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-accent shadow transition-transform duration-200"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {RANKING_METRICS.map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={m === metric}
          onClick={() => onChange(m)}
          className={cn(
            "relative z-10 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors sm:px-5",
            m === metric ? "text-accent-ink" : "text-ink-2 hover:text-ink",
          )}
        >
          {METRIC_LABEL[m]}
        </button>
      ))}
    </div>
  );
}

const dateFormat = (timeZone: string) =>
  new Intl.DateTimeFormat("ja-JP", { timeZone, year: "numeric", month: "long", day: "numeric", weekday: "short" });

function PeriodLabel({ period }: { period: PeriodInfo }) {
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-ink-2">
      <CalendarDays className="size-4 text-muted" aria-hidden />
      集計期間:{" "}
      {period.start ? `${dateFormat(period.timeZone).format(new Date(period.start))} 0:00 〜 現在` : "全期間の累計"}
      <span className="text-xs text-muted">（{period.timeZone}）</span>
    </p>
  );
}

const METRIC_NOTE: Record<"user" | "country", Record<RankingMetric, string>> = {
  user: {
    volume: "総量 = 期間内の推定量（ml）の合計",
    average: "平均 = 期間内の推定量 ÷ 経過日数（ml/日）。期間の途中に登録した人は登録日から数えるので、日割りペースで競えます",
    count: "総回数 = 期間内のランキング対象の記録回数",
  },
  country: {
    volume: "総量 = 国全体の推定量（ml）の合計",
    average: "平均 = 国全体の推定量 ÷ 期間内に記録した参加ユーザー数（ml/人）",
    count: "総回数 = 国全体の記録回数の合計",
  },
};

/** Rankings computed in the browser (built-in dummy users + accounts in this browser). */
export function RankingBoard() {
  const [type, setType] = useState<RankingType>("japan");
  const [period, setPeriod] = useState<RankingPeriodKey>("year");
  const [metric, setMetric] = useState<RankingMetric>("volume");
  const now = useClock();
  const minute = now === null ? 0 : Math.floor(now / 60_000);

  const data = useDb(() => {
    const viewer = getCurrentUser();
    const ranking =
      type === "worldcup"
        ? computeCountryRanking(metric, period, viewer)
        : computeUserRanking(type, metric, period, viewer);
    return { viewer, ranking };
  }, `${type}:${metric}:${period}:${minute}`);

  const ranking = data?.ranking ?? null;
  const viewer = data?.viewer ?? null;
  const scope = type === "worldcup" ? "country" : "user";
  const countdown =
    ranking?.period.nextReset && now !== null ? formatCountdown(new Date(ranking.period.nextReset).getTime() - now) : null;

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="ランキングの種類" className="grid grid-cols-3 gap-1 rounded-2xl border border-line bg-surface p-1">
        {TABS.map((tab) => {
          const selected = tab.type === type;
          const Icon = tab.icon;
          return (
            <button
              key={tab.type}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setType(tab.type)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-sm font-semibold whitespace-nowrap transition",
                selected ? "bg-surface-3 text-ink shadow-sm" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              {tab.flag ? <span className={`fi fi-${tab.flag}`} aria-hidden /> : Icon ? <Icon className="size-4" aria-hidden /> : null}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Period tabs + reset countdown */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div role="tablist" aria-label="集計期間" className="inline-flex rounded-xl border border-line bg-surface p-1">
          {RANKING_PERIODS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={key === period}
              onClick={() => setPeriod(key)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition sm:px-4",
                key === period ? "bg-surface-3 text-ink shadow-sm" : "text-ink-2 hover:text-ink",
              )}
            >
              {PERIOD_LABEL[key]}
            </button>
          ))}
        </div>
        {countdown && (
          <p className="flex items-center gap-1 text-xs text-muted" aria-live="polite">
            <RotateCcw className="size-3.5" aria-hidden />
            次回リセットまで：<span className="font-semibold text-ink-2">{countdown}</span>
          </p>
        )}
      </div>

      {/* Sort switch */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs text-muted">
          <ArrowDownWideNarrow className="size-3.5" aria-hidden />
          並び替え
        </span>
        <MetricSwitch metric={metric} onChange={setMetric} />
      </div>

      {!ranking ? (
        <div className="h-80 animate-pulse rounded-3xl bg-surface" aria-busy="true" />
      ) : (
        <>
          <PeriodLabel period={ranking.period} />
          {ranking.type === "worldcup" ? <CountryRankingView ranking={ranking} /> : <UserRankingView ranking={ranking} />}
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden />
            {METRIC_NOTE[scope][metric]}。週間は毎週月曜0:00、月間は毎月1日0:00、年間は1月1日0:00にリセットされます。
          </p>
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted">
            <Lock className="mt-px size-3.5 shrink-0" aria-hidden />
            ランキングに表示されるのはアイコン・ユーザーネーム・所属国・回数・推定量のみです。タグや記録時刻は表示されません。
            集計対象は、計測120分以内・前回の記録から30分経過後・1日5回までの記録です。デモ版のため、ランキングは組み込みのサンプルユーザーとこのブラウザ内のアカウントで構成されます。
          </p>
          {/* Room so the pinned bar never covers the last rows */}
          <div className="h-20" aria-hidden />

          {viewer &&
            (ranking.type === "worldcup" ? (
              <MyRankBar
                scope="country"
                metric={metric}
                rank={ranking.mine?.rank ?? null}
                score={ranking.mine?.score ?? null}
                gap={ranking.gapToNext}
                name={getCountryName(viewer.countryCode)}
                countryCode={viewer.countryCode}
                countryName={getCountryName(viewer.countryCode)}
                unrankedText="未ランク（所属国の記録なし）"
              />
            ) : (
              <MyRankBar
                scope="user"
                metric={metric}
                rank={ranking.me?.rank ?? null}
                score={ranking.me?.score ?? null}
                gap={ranking.gapToNext}
                name={viewer.username}
                avatar={viewer.avatar}
                countryCode={viewer.countryCode}
                countryName={getCountryName(viewer.countryCode)}
                unrankedText={
                  ranking.viewerEligible ? "未ランク（記録なし）" : "対象外（日本ランキングは所属国が日本のユーザーのみ）"
                }
              />
            ))}
        </>
      )}
    </div>
  );
}
