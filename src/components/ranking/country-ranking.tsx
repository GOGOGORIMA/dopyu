import { Sparkles } from "lucide-react";
import { Flag } from "@/components/flag";
import { cn } from "@/lib/cn";
import { METRIC_LABEL, type CountryRanking, type CountryRankingRow, type RankingMetric } from "@/lib/ranking";
import { formatCount } from "@/lib/time";
import { METRIC_COLUMNS, MetricValue, metricColumnClass } from "./metric-format";
import { RankBadge } from "./rank-badge";

const valueOf = (row: CountryRankingRow, metric: RankingMetric) =>
  metric === "volume" ? row.totalVolumeMl : metric === "average" ? row.averageVolumeMl : row.count;

export function CountryRankingView({ ranking }: { ranking: CountryRanking }) {
  const { metric } = ranking;

  if (ranking.rows.length === 0) {
    return (
      <div className="rounded-3xl border border-line bg-surface px-6 py-14 text-center">
        <Sparkles className="mx-auto size-8 text-violet" aria-hidden />
        <p className="mt-3 font-semibold">まだ参加国がありません</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface">
      <table className="w-full table-fixed text-sm">
        <caption className="sr-only">国別ワールドカップ（{METRIC_LABEL[metric]}順）</caption>
        <thead>
          <tr className="text-left text-xs text-muted">
            <th scope="col" className="w-14 py-2.5 pl-3 font-medium sm:w-16 sm:pl-4">順位</th>
            <th scope="col" className="py-2.5 font-medium">国</th>
            <th scope="col" className="hidden w-20 py-2.5 pr-3 text-right font-medium sm:table-cell">参加人数</th>
            {METRIC_COLUMNS.map((column, i) => (
              <th
                key={column}
                scope="col"
                aria-sort={column === metric ? "descending" : undefined}
                className={cn(
                  "py-2.5 text-right font-medium",
                  column === "count" ? "w-[4.5rem] sm:w-24" : "w-[5.5rem] sm:w-28",
                  i === METRIC_COLUMNS.length - 1 ? "pr-3 sm:pr-4" : "pr-2 sm:pr-3",
                  metricColumnClass(column, metric),
                  column === metric && "text-ink",
                )}
              >
                {METRIC_LABEL[column]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ranking.rows.map((row) => (
            <tr key={row.countryCode} className={cn("border-t border-line", row.isMyCountry && "bg-accent/[0.07]")}>
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
                    {/* On phones, participants and the "所属国" badge fold into a sub-line */}
                    <div className="truncate text-[11px] text-muted sm:hidden">
                      {row.isMyCountry && <span className="font-bold text-accent">所属国 · </span>}
                      参加{formatCount(row.activeMemberCount)}/{formatCount(row.memberCount)}人
                    </div>
                  </div>
                </div>
              </td>
              <td className="hidden py-3 pr-3 text-right text-ink-2 tabular-nums sm:table-cell">
                {formatCount(row.activeMemberCount)}
                <span className="text-xs text-muted">/{formatCount(row.memberCount)}人</span>
              </td>
              {METRIC_COLUMNS.map((column, i) => (
                <td
                  key={column}
                  className={cn(
                    "py-3 text-right text-[13px] text-ink-2 sm:text-sm",
                    i === METRIC_COLUMNS.length - 1 ? "pr-3 sm:pr-4" : "pr-2 sm:pr-3",
                    metricColumnClass(column, metric),
                    column === metric && "font-bold text-ink",
                  )}
                >
                  <MetricValue metric={column} value={valueOf(row, column)} scope="country" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
