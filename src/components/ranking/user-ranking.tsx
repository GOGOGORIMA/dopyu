import { Crown, Medal, Sparkles } from "lucide-react";
import { Flag } from "@/components/flag";
import { cn } from "@/lib/cn";
import type { UserRanking, UserRankingRow } from "@/lib/services/ranking";
import { formatCount, formatMl } from "@/lib/time";
import { RankBadge } from "./rank-badge";

function MeChip() {
  return (
    <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
      あなた
    </span>
  );
}

// The DOM keeps 1st, 2nd, 3rd order (for screen readers); CSS order places it visually as 2nd, 1st, 3rd
const PODIUM_STYLE = {
  1: { ring: "ring-gold/50", glow: "shadow-[0_0_40px_-12px_rgb(251_191_36/0.7)]", text: "text-gold", height: "pt-6", order: "order-2" },
  2: { ring: "ring-silver/40", glow: "", text: "text-silver", height: "pt-3", order: "order-1" },
  3: { ring: "ring-bronze/40", glow: "", text: "text-bronze", height: "pt-3", order: "order-3" },
} as const;

function PodiumCard({ row }: { row: UserRankingRow }) {
  const style = PODIUM_STYLE[Math.min(row.rank, 3) as 1 | 2 | 3];
  const Icon = row.rank === 1 ? Crown : Medal;
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
      <span className={cn("mt-1 text-xs font-bold", style.text)}>{row.rank}位</span>
      <Flag code={row.countryCode} name={row.countryName} className="mt-3 text-xl" />
      <span className="mt-2 w-full truncate text-sm font-semibold" title={row.username}>
        {row.username}
      </span>
      {row.isMe && <MeChip />}
      <span className="mt-2 text-xl font-bold">
        {formatCount(row.count)}
        <span className="ml-0.5 text-xs font-medium text-ink-2">回</span>
      </span>
      <span className="text-xs text-muted">{formatMl(row.totalVolumeMl)}ml</span>
    </li>
  );
}

function RankingRow({ row }: { row: UserRankingRow }) {
  return (
    <tr className={cn("border-t border-line", row.isMe && "bg-accent/[0.07]")}>
      <td className="py-3 pr-1 pl-3 sm:pl-4">
        <RankBadge rank={row.rank} />
      </td>
      <td className="max-w-0 py-3 pr-2">
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <Flag code={row.countryCode} name={row.countryName} />
          <span className="truncate font-medium" title={row.username}>
            {row.username}
          </span>
          {row.isMe && <MeChip />}
        </div>
      </td>
      <td className="py-3 pr-3 text-right whitespace-nowrap tabular-nums sm:pr-3">
        <div className="font-semibold">
          {formatCount(row.count)}
          <span className="ml-0.5 text-xs font-normal text-muted">回</span>
        </div>
        {/* On phones, total volume moves to a sub-line */}
        <div className="text-xs text-muted sm:hidden">{formatMl(row.totalVolumeMl)}ml</div>
      </td>
      <td className="hidden py-3 pr-4 text-right whitespace-nowrap text-ink-2 tabular-nums sm:table-cell">
        {formatMl(row.totalVolumeMl)}
        <span className="ml-0.5 text-xs text-muted">ml</span>
      </td>
    </tr>
  );
}

export function UserRankingView({ ranking }: { ranking: UserRanking }) {
  const { rows, me } = ranking;
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-line bg-surface px-6 py-14 text-center">
        <Sparkles className="mx-auto size-8 text-violet" aria-hidden />
        <p className="mt-3 font-semibold">今年の記録はまだありません</p>
        <p className="mt-1 text-sm text-ink-2">最初の1位を狙いましょう。</p>
      </div>
    );
  }

  const podium = rows.filter((row) => row.rank <= 3).slice(0, 3);
  const rest = rows.slice(podium.length);
  const meOutsideList = me !== null && !rows.some((row) => row.isMe);

  return (
    <div className="space-y-4">
      {me ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/[0.07] px-4 py-3">
          <div className="text-sm text-ink-2">
            あなたの順位
            <span className="ml-2 text-2xl font-bold text-ink">{me.rank}</span>
            <span className="text-sm text-ink-2">位</span>
            <span className="ml-1 text-xs text-muted">/ {formatCount(ranking.participantCount)}人中</span>
          </div>
          <div className="text-right text-sm">
            <div className="font-semibold">{formatCount(me.count)}回</div>
            <div className="text-xs text-muted">{formatMl(me.totalVolumeMl)}ml</div>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink-2">
          {ranking.type === "japan"
            ? "このランキングは所属国が日本のユーザーが対象です。"
            : "今年はまだランキング対象の記録がありません。記録するとここに順位が表示されます。"}
        </p>
      )}

      {podium.length > 0 && (
        <ol className="grid grid-cols-3 items-end gap-2 sm:gap-4" aria-label="トップ3">
          {podium.map((row) => (
            <PodiumCard key={row.username} row={row} />
          ))}
        </ol>
      )}

      {(rest.length > 0 || meOutsideList) && (
        <div className="overflow-hidden rounded-3xl border border-line bg-surface">
          <table className="w-full table-fixed text-sm">
            <caption className="sr-only">順位表</caption>
            <thead>
              <tr className="text-left text-xs text-muted">
                <th scope="col" className="w-14 py-2.5 pl-3 font-medium sm:w-16 sm:pl-4">順位</th>
                <th scope="col" className="py-2.5 font-medium">ユーザー</th>
                <th scope="col" className="w-24 py-2.5 pr-3 text-right font-medium">
                  年間回数<span className="sm:hidden"> / 総量</span>
                </th>
                <th scope="col" className="hidden w-28 py-2.5 pr-4 text-right font-medium sm:table-cell">推定総量</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((row) => (
                <RankingRow key={row.username} row={row} />
              ))}
              {meOutsideList && me && (
                <>
                  <tr aria-hidden>
                    <td colSpan={4} className="border-t border-line py-1 text-center text-muted">
                      ⋯
                    </td>
                  </tr>
                  <RankingRow row={me} />
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
