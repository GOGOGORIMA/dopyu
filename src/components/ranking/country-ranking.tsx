import { Sparkles } from "lucide-react";
import { Flag } from "@/components/flag";
import { cn } from "@/lib/cn";
import type { CountryRanking } from "@/lib/ranking";
import { formatCount, formatMl } from "@/lib/time";
import { RankBadge } from "./rank-badge";

export function CountryRankingView({ ranking }: { ranking: CountryRanking }) {
  const sortedByAverage = ranking.sort === "average";

  if (ranking.rows.length === 0) {
    return (
      <div className="rounded-3xl border border-line bg-surface px-6 py-14 text-center">
        <Sparkles className="mx-auto size-8 text-violet" aria-hidden />
        <p className="mt-3 font-semibold">まだ参加国がありません</p>
      </div>
    );
  }

  const activeHead = "text-ink";
  const activeCell = "font-bold text-ink";

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface">
      <table className="w-full table-fixed text-sm">
        <caption className="sr-only">
          国別ワールドカップ（{sortedByAverage ? "1人あたり平均回数" : "国全体の推定総量"}順）
        </caption>
        <thead>
          <tr className="text-left text-xs text-muted">
            <th scope="col" className="w-14 py-2.5 pl-3 font-medium sm:w-16 sm:pl-4">順位</th>
            <th scope="col" className="py-2.5 font-medium">国</th>
            <th scope="col" className="hidden w-20 py-2.5 pr-3 text-right font-medium sm:table-cell">人数</th>
            <th scope="col" className="hidden w-24 py-2.5 pr-3 text-right font-medium sm:table-cell">総回数</th>
            <th
              scope="col"
              aria-sort={sortedByAverage ? "descending" : undefined}
              className={cn("w-[4.5rem] py-2.5 pr-2 text-right font-medium sm:w-24 sm:pr-3", sortedByAverage && activeHead)}
            >
              平均回数
            </th>
            <th
              scope="col"
              aria-sort={!sortedByAverage ? "descending" : undefined}
              className={cn("w-[5.5rem] py-2.5 pr-3 text-right font-medium sm:w-28 sm:pr-4", !sortedByAverage && activeHead)}
            >
              推定総量
            </th>
          </tr>
        </thead>
        <tbody>
          {ranking.rows.map((row) => (
            <tr
              key={row.countryCode}
              className={cn("border-t border-line", row.isMyCountry && "bg-accent/[0.07]")}
            >
              <td className="py-3 pr-1 pl-3 sm:pl-4">
                <RankBadge rank={row.rank} />
              </td>
              <td className="max-w-0 py-3 pr-2">
                <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                  <Flag code={row.countryCode} name={row.countryName} className="sm:text-lg" />
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-medium" title={row.countryName}>
                        {row.countryName}
                      </span>
                      {row.isMyCountry && (
                        <span className="hidden shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent sm:inline">
                          所属国
                        </span>
                      )}
                    </div>
                    {/* On phones, people, total count and the "所属国" badge fold into a sub-line */}
                    <div className="truncate text-[11px] text-muted sm:hidden">
                      {row.isMyCountry && <span className="font-bold text-accent">所属国 · </span>}
                      {formatCount(row.memberCount)}人 · {formatCount(row.count)}回
                    </div>
                  </div>
                </div>
              </td>
              <td className="hidden py-3 pr-3 text-right text-ink-2 tabular-nums sm:table-cell">
                {formatCount(row.memberCount)}
                <span className="ml-0.5 text-xs text-muted">人</span>
              </td>
              <td className="hidden py-3 pr-3 text-right text-ink-2 tabular-nums sm:table-cell">
                {formatCount(row.count)}
                <span className="ml-0.5 text-xs text-muted">回</span>
              </td>
              <td className={cn("py-3 pr-2 text-right text-[13px] whitespace-nowrap text-ink-2 tabular-nums sm:pr-3 sm:text-sm", sortedByAverage && activeCell)}>
                {row.averageCount.toFixed(1)}
                <span className="ml-0.5 text-xs font-normal text-muted">回</span>
              </td>
              <td className={cn("py-3 pr-3 text-right text-[13px] whitespace-nowrap text-ink-2 tabular-nums sm:pr-4 sm:text-sm", !sortedByAverage && activeCell)}>
                {formatMl(row.totalVolumeMl)}
                <span className="ml-0.5 text-xs font-normal text-muted">ml</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
