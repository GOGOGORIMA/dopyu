"use client";

import { ArrowDownWideNarrow, CalendarDays, Earth, Info, Lock, RotateCcw, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { useI18n, type Lang } from "@/lib/i18n";
import { countryName, locale, METRIC_LABELS, PERIOD_LABELS } from "@/lib/i18n-dict";
import { getCurrentUser, useDb, useRemoteRankingSync } from "@/lib/local-db";
import { computeCountryRanking, computeUserRanking, RANKING_METRICS, type PeriodInfo, type RankingMetric } from "@/lib/ranking";
import { formatCountdown, RANKING_PERIODS, type RankingPeriodKey } from "@/lib/ranking-period";
import { rankShareText, xShareUrl } from "@/lib/share";
import { isSupabaseEnabled } from "@/lib/supabase";
import type { RankingType } from "@/lib/validation";
import { CountryRankingView } from "./country-ranking";
import { MyRankBar } from "./my-rank-bar";
import { UserRankingView } from "./user-ranking";

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

/** "あと3日5時間" / "3d 5h left" */
function countdownText(ms: number, lang: Lang) {
  if (lang === "ja") return formatCountdown(ms);
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  return d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

/** 3-way toggle switch: Volume (default) / Daily Avg / Count, with a sliding indicator. */
function MetricSwitch({ metric, onChange }: { metric: RankingMetric; onChange: (m: RankingMetric) => void }) {
  const { lang, t } = useI18n();
  const index = RANKING_METRICS.indexOf(metric);
  return (
    <div role="radiogroup" aria-label={t("並び替え", "Sort by")} className="relative grid grid-cols-3 rounded-full border border-line bg-surface p-1">
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
            "relative z-10 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors sm:px-5",
            m === metric ? "text-accent-ink" : "text-ink-2 hover:text-ink",
          )}
        >
          {METRIC_LABELS[lang][m]}
        </button>
      ))}
    </div>
  );
}

function PeriodLabel({ period }: { period: PeriodInfo }) {
  const { lang, t } = useI18n();
  const date = period.start
    ? new Intl.DateTimeFormat(locale(lang), {
        timeZone: "UTC",
        year: "numeric",
        month: lang === "en" ? "short" : "long",
        day: "numeric",
        weekday: "short",
      }).format(new Date(period.start))
    : null;
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-ink-2">
      <CalendarDays className="size-4 text-muted" aria-hidden />
      {t("集計期間:", "Period:")}{" "}
      {date ? t(`${date} 0:00 〜 現在`, `${date} 00:00 – now`) : t("全期間の累計", "All-time total")}
      <span className="text-xs text-muted">(UTC)</span>
    </p>
  );
}

const METRIC_NOTE: Record<Lang, Record<"user" | "country", Record<RankingMetric, string>>> = {
  ja: {
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
  },
  en: {
    user: {
      volume: "Volume = total estimated ml in the period",
      average: "Daily Avg = estimated ml ÷ days in the period (counted from your sign-up date if you joined mid-period)",
      count: "Count = number of ranked sessions in the period",
    },
    country: {
      volume: "Volume = the country's total estimated ml",
      average: "Daily Avg = the country's total ml ÷ members who recorded in the period (ml per person)",
      count: "Count = the country's total number of ranked sessions",
    },
  },
};

/** Rankings computed in the browser (built-in dummy users + accounts in this browser, or Supabase). */
export function RankingBoard() {
  const { lang, t } = useI18n();
  const [type, setType] = useState<RankingType>("national");
  const [period, setPeriod] = useState<RankingPeriodKey>("year");
  const [metric, setMetric] = useState<RankingMetric>("volume");
  const now = useClock();
  useRemoteRankingSync();
  const minute = now === null ? 0 : Math.floor(now / 60_000);

  const data = useDb(() => {
    const viewer = getCurrentUser();
    // National ranking = the viewer's country (logged out: JP for Japanese UI, US for English UI)
    const nationalCountry = viewer?.countryCode ?? (lang === "en" ? "US" : "JP");
    const ranking =
      type === "worldcup"
        ? computeCountryRanking(metric, period, viewer)
        : computeUserRanking(type, metric, period, viewer, new Date(), 100, nationalCountry);
    return { viewer, ranking, nationalCountry };
  }, `${type}:${metric}:${period}:${minute}:${lang}`);

  const ranking = data?.ranking ?? null;
  const viewer = data?.viewer ?? null;
  const nationalCountry = data?.nationalCountry ?? (lang === "en" ? "US" : "JP");
  const scope = type === "worldcup" ? "country" : "user";
  const countdown =
    ranking?.period.nextReset && now !== null ? countdownText(new Date(ranking.period.nextReset).getTime() - now, lang) : null;
  const nationalLabel = lang === "ja" && nationalCountry === "JP" ? "日本国内" : t("国内（National）", "National");
  const periodLabel = PERIOD_LABELS[lang][period];

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label={t("ランキングの種類", "Ranking type")} className="grid grid-cols-3 gap-1 rounded-2xl border border-line bg-surface p-1">
        {(
          [
            { type: "national", label: nationalLabel, flag: nationalCountry.toLowerCase() },
            { type: "world", label: t("世界", "Global"), icon: Earth },
            { type: "worldcup", label: t("ワールドカップ", "World Cup"), icon: Trophy },
          ] as const
        ).map((tab) => {
          const selected = tab.type === type;
          return (
            <button
              key={tab.type}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setType(tab.type)}
              className={cn(
                "flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-sm font-semibold whitespace-nowrap transition",
                selected ? "bg-surface-3 text-ink shadow-sm" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              {"flag" in tab ? <span className={`fi fi-${tab.flag}`} aria-hidden /> : <tab.icon className="size-4" aria-hidden />}
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Period tabs + reset countdown (UTC, shared worldwide) */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div role="tablist" aria-label={t("集計期間", "Period")} className="inline-flex rounded-xl border border-line bg-surface p-1">
          {RANKING_PERIODS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={key === period}
              onClick={() => setPeriod(key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition sm:px-4",
                key === period ? "bg-surface-3 text-ink shadow-sm" : "text-ink-2 hover:text-ink",
              )}
            >
              {PERIOD_LABELS[lang][key]}
            </button>
          ))}
        </div>
        {countdown && (
          <div className="text-xs text-muted" aria-live="polite">
            <p className="flex items-center gap-1">
              <RotateCcw className="size-3.5" aria-hidden />
              {t("次回リセットまで：", "Next reset: ")}
              <span className="font-semibold text-ink-2">{countdown}</span>
            </p>
            <p className="mt-0.5 text-[10px]">
              {t("※世界共通 UTC 00:00（日本時間 09:00）リセット", "*Global reset at 00:00 UTC (09:00 JST)")}
            </p>
          </div>
        )}
      </div>

      {/* Sort switch */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs text-muted">
          <ArrowDownWideNarrow className="size-3.5" aria-hidden />
          {t("並び替え", "Sort")}
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
            {METRIC_NOTE[lang][scope][metric]}
            {t(
              "。週間は毎週月曜、月間は毎月1日、年間は1月1日の UTC 0:00（日本時間 9:00）にリセットされます。",
              ". Weekly resets every Monday, Monthly on the 1st, Yearly on Jan 1 — all at 00:00 UTC.",
            )}
          </p>
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted">
            <Lock className="mt-px size-3.5 shrink-0" aria-hidden />
            {t(
              "ランキングに表示されるのはアイコン・ユーザーネーム・所属国・回数・推定量のみです。タグや記録時刻は表示されません。集計対象は、計測120分以内・前回の記録から30分経過後・1日5回（UTC基準）までの記録です。",
              "Rankings only show icon, username, country, count and estimated volume — never your tags or times. Ranked sessions: up to 120 min, at least 30 min after the previous one, max 5 per UTC day.",
            )}
            {!isSupabaseEnabled &&
              t(
                "現在のバージョンでは、ランキングは組み込みのサンプルユーザーと、このブラウザで登録されたアカウントで構成されます。",
                " In the current version, rankings consist of built-in sample users and accounts registered in this browser.",
              )}
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
                name={countryName(viewer.countryCode, lang)}
                countryCode={viewer.countryCode}
                countryName={countryName(viewer.countryCode, lang)}
                unrankedText={t("未ランク（所属国の記録なし）", "Unranked (no records from your country)")}
                shareUrl={
                  ranking.mine
                    ? xShareUrl(
                        rankShareText(
                          periodLabel,
                          t(`ワールドカップ（${countryName(viewer.countryCode, lang)}）`, `World Cup (${countryName(viewer.countryCode, lang)})`),
                          ranking.mine.rank,
                          ranking.mine.totalVolumeMl,
                          lang,
                        ),
                      )
                    : null
                }
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
                countryName={countryName(viewer.countryCode, lang)}
                unrankedText={
                  ranking.viewerEligible
                    ? t("未ランク（記録なし）", "Unranked (no records)")
                    : t("対象外（所属国のユーザーのみ）", "Not eligible (members of this country only)")
                }
                shareUrl={
                  ranking.me
                    ? xShareUrl(
                        rankShareText(
                          periodLabel,
                          ranking.type === "national" ? t("国内", "National") : t("世界", "Global"),
                          ranking.me.rank,
                          ranking.me.totalVolumeMl,
                          lang,
                        ),
                      )
                    : null
                }
              />
            ))}
        </>
      )}
    </div>
  );
}
