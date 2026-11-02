import { Crown, Medal, Sparkles } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Flag } from "@/components/flag";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { countryName, METRIC_LABELS } from "@/lib/i18n-dict";
import type { RankingMetric, UserRanking, UserRankingRow } from "@/lib/ranking";
import { METRIC_COLUMNS, MetricValue, metricColumnClass, metricText } from "./metric-format";
import { RankBadge } from "./rank-badge";

function MeChip() {
  const { t } = useI18n();
  return (
    <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
      {t("あなた", "You")}
    </span>
  );
}

const valueOf = (row: UserRankingRow, metric: RankingMetric) =>
  metric === "volume" ? row.totalVolumeMl : metric === "average" ? row.averagePerDayMl : row.count;

// The DOM keeps 1st, 2nd, 3rd order (for screen readers); CSS order places it visually as 2nd, 1st, 3rd
const PODIUM_STYLE = {
  1: { ring: "ring-gold/50", glow: "shadow-[0_0_40px_-12px_rgb(251_191_36/0.7)]", text: "text-gold", height: "pt-6", order: "order-2" },
  2: { ring: "ring-silver/40", glow: "", text: "text-silver", height: "pt-3", order: "order-1" },
  3: { ring: "ring-bronze/40", glow: "", text: "text-bronze", height: "pt-3", order: "order-3" },
} as const;

function PodiumCard({ row, metric }: { row: UserRankingRow; metric: RankingMetric }) {
  const style = PODIUM_STYLE[Math.min(row.rank, 3) as 1 | 2 | 3];
  const Icon = row.rank === 1 ? Crown : Medal;
  const others = METRIC_COLUMNS.filter((m) => m !== metric);
  const { lang, t } = useI18n();
  return (
    <li
      className={cn(
        "flex min-w-0 flex-col items-center rounded-2xl bg-surface px-2 pb-4 text-center ring-1",
        style.ring,
        style.glow,
        style.height,
        style.order,
        row.isMe && "bg-accent/10",
      )}
    >
      <Icon className={cn("size-6", style.text)} aria-hidden />
      <span className={cn("mt-1 text-xs font-bold", style.text)}>{t(`${row.rank}位`, `#${row.rank}`)}</span>
      <Avatar avatar={row.avatar} name={row.username} className="mt-3 size-12" />
      <span className="mt-2 flex w-full min-w-0 items-center justify-center gap-1.5 text-sm font-semibold">
        <Flag code={row.countryCode} name={countryName(row.countryCode, lang)} />
        <span className="truncate" title={row.username}>{row.username}</span>
      </span>
      {row.isMe && <MeChip />}
      <MetricValue
        metric={metric}
        value={valueOf(row, metric)}
        scope="user"
        className="mt-2 text-lg font-bold sm:text-xl"
        unitClassName="text-ink-2 font-medium"
      />
      <span className="text-[11px] text-muted">
        {others.map((m) => metricText(m, valueOf(row, m), "user", lang)).join(" · ")}
      </span>
    </li>
  );
}

function RankingRow({ row, metric }: { row: UserRankingRow; metric: RankingMetric }) {
  const { lang } = useI18n();
  return (
    <tr className={cn("border-t border-line", row.isMe && "bg-accent/[0.07]")}>
      <td className="py-3 pr-1 pl-3 sm:pl-4">
        <RankBadge rank={row.rank} />
      </td>
      <td className="max-w-0 py-3 pr-2">
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <Avatar avatar={row.avatar} name={row.username} className="size-8" />
          <Flag code={row.countryCode} name={countryName(row.countryCode, lang)} />
          <span className="truncate font-medium" title={row.username}>
            {row.username}
          </span>
          {row.isMe && <MeChip />}
        </div>
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
          <MetricValue metric={column} value={valueOf(row, column)} scope="user" />
        </td>
      ))}
    </tr>
  );
}

export function UserRankingView({ ranking }: { ranking: UserRanking }) {
  const { rows, me, metric } = ranking;
  const { lang, t } = useI18n();
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-line bg-surface px-6 py-14 text-center">
        <Sparkles className="mx-auto size-8 text-violet" aria-hidden />
        <p className="mt-3 font-semibold">{t("この期間の記録はまだありません", "No records in this period yet")}</p>
        <p className="mt-1 text-sm text-ink-2">{t("最初の1位を狙いましょう。", "Go grab the first #1 spot.")}</p>
      </div>
    );
  }

  const podium = rows.filter((row) => row.rank <= 3).slice(0, 3);
  const rest = rows.slice(podium.length);
  const meOutsideList = me !== null && !rows.some((row) => row.isMe);

  return (
    <div className="space-y-4">
      {podium.length > 0 && (
        <ol className="grid grid-cols-3 items-end gap-2 sm:gap-4" aria-label={t("トップ3", "Top 3")}>
          {podium.map((row) => (
            <PodiumCard key={row.username} row={row} metric={metric} />
          ))}
        </ol>
      )}

      {(rest.length > 0 || meOutsideList) && (
        <div className="overflow-hidden rounded-3xl border border-line bg-surface">
          <table className="w-full table-fixed text-sm">
            <caption className="sr-only">{t("順位表", "Leaderboard")}</caption>
            <thead>
              <tr className="text-left text-xs text-muted">
                <th scope="col" className="w-14 py-2.5 pl-3 font-medium sm:w-16 sm:pl-4">{t("順位", "Rank")}</th>
                <th scope="col" className="py-2.5 font-medium">{t("ユーザー", "User")}</th>
                {METRIC_COLUMNS.map((column, i) => (
                  <th
                    key={column}
                    scope="col"
                    aria-sort={column === metric ? "descending" : undefined}
                    className={cn(
                      "py-2.5 text-right font-medium",
                      column === "count" ? "w-16 sm:w-20" : "w-[5.25rem] sm:w-28",
                      i === METRIC_COLUMNS.length - 1 ? "pr-3 sm:pr-4" : "pr-2 sm:pr-3",
                      metricColumnClass(column, metric),
                      column === metric && "text-ink",
                    )}
                  >
                    {METRIC_LABELS[lang][column]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rest.map((row) => (
                <RankingRow key={row.username} row={row} metric={metric} />
              ))}
              {meOutsideList && me && (
                <>
                  <tr aria-hidden>
                    <td colSpan={5} className="border-t border-line py-1 text-center text-muted">
                      ⋯
                    </td>
                  </tr>
                  <RankingRow row={me} metric={metric} />
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
