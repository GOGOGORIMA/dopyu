import { ArrowDownWideNarrow, CalendarDays, Earth, Info, Lock, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CountryRankingView } from "@/components/ranking/country-ranking";
import { UserRankingView } from "@/components/ranking/user-ranking";
import { requireUser } from "@/lib/auth/dal";
import { cn } from "@/lib/cn";
import { MIN_RANKABLE_SECONDS } from "@/lib/constants";
import {
  getCountryRanking,
  getUserRanking,
  type RankingPeriod,
} from "@/lib/services/ranking";
import {
  parseRankingType,
  parseWorldCupSort,
  type RankingType,
  type WorldCupSort,
} from "@/lib/validation";

export const metadata: Metadata = { title: "ランキング" };

const TABS: { type: RankingType; label: string; flag?: string; icon?: typeof Trophy }[] = [
  { type: "japan", label: "日本", flag: "jp" },
  { type: "world", label: "世界", icon: Earth },
  { type: "worldcup", label: "ワールドカップ", icon: Trophy },
];

const SORTS: { sort: WorldCupSort; label: string }[] = [
  { sort: "average", label: "1人あたり平均回数" },
  { sort: "volume", label: "国全体の総量" },
];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function RankingPage(props: PageProps<"/ranking">) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold tracking-[0.3em] text-accent">RANKING</p>
        <h1 className="mt-1 text-2xl font-bold">年間ランキング</h1>
      </div>
      {/* searchParams, the session and the DB are request-time data, so they stream in behind Suspense */}
      <Suspense fallback={<RankingFallback />}>
        <RankingContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function RankingContent({ searchParams }: { searchParams: PageProps<"/ranking">["searchParams"] }) {
  const params = await searchParams;
  const type = parseRankingType(first(params.type));
  const sort = parseWorldCupSort(first(params.sort));
  const user = await requireUser();

  const ranking =
    type === "worldcup"
      ? await getCountryRanking({ sort, viewerCountryCode: user.countryCode })
      : await getUserRanking({ type, viewerId: user.id });

  return (
    <>
      <RankingTabs active={type} />
      <PeriodNote period={ranking.period} />
      {ranking.type === "worldcup" ? (
        <>
          <SortToggle active={ranking.sort} />
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
        ランキングに表示されるのはユーザーネーム・所属国・回数・推定総量のみです。タグや記録時刻は公開されません。
        計測時間{MIN_RANKABLE_SECONDS}秒未満の記録は集計対象外です。
      </p>
    </>
  );
}

function RankingTabs({ active }: { active?: RankingType }) {
  return (
    <nav aria-label="ランキングの種類" className="grid grid-cols-3 gap-1 rounded-2xl border border-line bg-surface p-1">
      {TABS.map((tab) => {
        const selected = tab.type === active;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.type}
            href={tab.type === "japan" ? "/ranking" : `/ranking?type=${tab.type}`}
            scroll={false}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-sm font-semibold whitespace-nowrap transition",
              selected ? "bg-surface-3 text-ink shadow-sm" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
            )}
          >
            {tab.flag ? (
              <span className={`fi fi-${tab.flag}`} aria-hidden />
            ) : Icon ? (
              <Icon className="size-4" aria-hidden />
            ) : null}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SortToggle({ active }: { active: WorldCupSort }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1 text-xs text-muted">
        <ArrowDownWideNarrow className="size-3.5" aria-hidden />
        並び替え
      </span>
      <div role="group" aria-label="並び替え" className="inline-flex rounded-full border border-line bg-surface p-1">
        {SORTS.map((option) => {
          const selected = option.sort === active;
          return (
            <Link
              key={option.sort}
              href={`/ranking?type=worldcup&sort=${option.sort}`}
              scroll={false}
              aria-current={selected ? "true" : undefined}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                selected ? "bg-accent text-accent-ink" : "text-ink-2 hover:text-ink",
              )}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function PeriodNote({ period }: { period: RankingPeriod }) {
  return (
    <p className="flex items-center gap-1.5 text-sm text-ink-2">
      <CalendarDays className="size-4 text-muted" aria-hidden />
      集計期間: {period.year}年1月1日〜12月31日
      <span className="text-xs text-muted">（{period.timeZone}）</span>
    </p>
  );
}

function RankingFallback() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="読み込み中">
      <RankingTabs />
      <div className="h-5 w-64 animate-pulse rounded bg-surface" />
      <div className="h-16 animate-pulse rounded-2xl bg-surface" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-3xl bg-surface" />
    </div>
  );
}
