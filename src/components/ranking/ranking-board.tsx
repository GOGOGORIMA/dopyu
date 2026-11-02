"use client";

import { ArrowDownWideNarrow, CalendarDays, Earth, Info, Lock, Trophy, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
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

/** Toggle switch for the World Cup sort: left = total volume (default), right = average per member. */
function SortSwitch({ sort, onChange }: { sort: WorldCupSort; onChange: (sort: WorldCupSort) => void }) {
  const average = sort === "average";
  const label = (active: boolean) =>
    cn("text-sm font-semibold transition-colors", active ? "text-ink" : "text-muted hover:text-ink-2");
  return (
    <div className="flex items-center gap-2.5">
      <button type="button" onClick={() => onChange("volume")} className={label(!average)}>
        総量
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={average}
        aria-label={average ? "並び替え: 1人あたり平均（総量に切り替える）" : "並び替え: 国全体の総量（平均に切り替える）"}
        onClick={() => onChange(average ? "volume" : "average")}
        className="relative h-7 w-12 shrink-0 rounded-full border border-line-strong bg-surface-3 transition-colors focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-5.5 rounded-full bg-accent shadow transition-transform duration-200",
            average && "translate-x-5",
          )}
          aria-hidden
        />
      </button>
      <button type="button" onClick={() => onChange("average")} className={label(average)}>
        平均
      </button>
    </div>
  );
}

/** Yearly ranking, computed in the browser (built-in dummy users + accounts in this browser). */
export function RankingBoard() {
  const [type, setType] = useState<RankingType>("japan");
  const [sort, setSort] = useState<WorldCupSort>("volume");
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
                <SortSwitch sort={sort} onChange={setSort} />
                <span className="text-xs text-muted">
                  {sort === "volume" ? "国全体の推定総量（ml）の多い順" : "1人あたり平均推定量（ml）の多い順"}
                </span>
              </div>
              <CountryRankingView ranking={ranking} />
              <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted">
                <Info className="mt-px size-3.5 shrink-0" aria-hidden />
                平均 = 国全体の推定総量 ÷ 所属ユーザー数（ml）。人数の少ない国も公平に比べられます。
              </p>
            </>
          ) : (
            <UserRankingView ranking={ranking} />
          )}
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted">
            <Lock className="mt-px size-3.5 shrink-0" aria-hidden />
            ランキングに表示されるのはアイコン・ユーザーネーム・所属国・回数・推定総量のみです。タグや記録時刻は表示されません。
            集計対象は、計測120分以内・前回の記録から30分経過後・1日5回までの記録です。デモ版のため、ランキングは組み込みのサンプルユーザーとこのブラウザ内のアカウントで構成されます。
          </p>
        </>
      )}
    </div>
  );
}
