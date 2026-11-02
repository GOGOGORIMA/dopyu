"use client";

import { ArrowDownWideNarrow, CalendarDays, Earth, Info, Lock, Trophy, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { MIN_RANKABLE_SECONDS } from "@/lib/constants";
import { getCurrentUser, useDb } from "@/lib/local-db";
import { computeCountryRanking, computeUserRanking } from "@/lib/ranking";
import type { RankingType, WorldCupSort } from "@/lib/validation";
import { CountryRankingView } from "./country-ranking";
import { UserRankingView } from "./user-ranking";

const TABS: { type: RankingType; label: string; flag?: string; icon?: LucideIcon }[] = [
  { type: "japan", label: "日本", flag: "jp" },
  { type: "world", label: "世界", icon: Earth },
  { type: "worldcup", label: "ワールドカップ", icon: Trophy },
];

const SORTS: { sort: WorldCupSort; label: string }[] = [
  { sort: "average", label: "1人あたり平均回数" },
  { sort: "volume", label: "国全体の総量" },
];

/** Yearly ranking, computed in the browser (built-in dummy users + accounts in this browser). */
export function RankingBoard() {
  const [type, setType] = useState<RankingType>("japan");
  const [sort, setSort] = useState<WorldCupSort>("average");
  const ranking = useDb(() => {
    const viewer = getCurrentUser();
    return type === "worldcup" ? computeCountryRanking(sort, viewer) : computeUserRanking(type, viewer);
  }, `${type}:${sort}`);

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

      {!ranking ? (
        <div className="h-80 animate-pulse rounded-3xl bg-surface" aria-busy="true" />
      ) : (
        <>
          <p className="flex items-center gap-1.5 text-sm text-ink-2">
            <CalendarDays className="size-4 text-muted" aria-hidden />
            集計期間: {ranking.period.year}年1月1日〜12月31日
            <span className="text-xs text-muted">（{ranking.period.timeZone}）</span>
          </p>
          {ranking.type === "worldcup" ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-muted">
                  <ArrowDownWideNarrow className="size-3.5" aria-hidden />
                  並び替え
                </span>
                <div role="group" aria-label="並び替え" className="inline-flex rounded-full border border-line bg-surface p-1">
                  {SORTS.map((option) => (
                    <button
                      key={option.sort}
                      type="button"
                      aria-pressed={option.sort === sort}
                      onClick={() => setSort(option.sort)}
                      className={cn(
                        "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                        option.sort === sort ? "bg-accent text-accent-ink" : "text-ink-2 hover:text-ink",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <CountryRankingView ranking={ranking} />
              <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted">
                <Info className="mt-px size-3.5 shrink-0" aria-hidden />
                平均回数 = 国の総回数 ÷ 所属ユーザー数。人数の少ない国も公平に比べられます。
              </p>
            </>
          ) : (
            <UserRankingView ranking={ranking} />
          )}
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted">
            <Lock className="mt-px size-3.5 shrink-0" aria-hidden />
            ランキングに表示されるのはユーザーネーム・所属国・回数・推定総量のみです。タグや記録時刻は表示されません。
            計測時間{MIN_RANKABLE_SECONDS}秒未満の記録は集計対象外です。デモ版のため、ランキングは組み込みのサンプルユーザーとこのブラウザ内のアカウントで構成されます。
          </p>
        </>
      )}
    </div>
  );
}
