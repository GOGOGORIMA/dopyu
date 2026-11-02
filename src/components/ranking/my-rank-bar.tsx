import { ArrowUp, Crown } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Flag } from "@/components/flag";
import { cn } from "@/lib/cn";
import { METRIC_LABEL, type GapToNext, type RankingMetric } from "@/lib/ranking";
import { MetricValue, metricText } from "./metric-format";
import { RankBadge } from "./rank-badge";

type Props = {
  metric: RankingMetric;
  scope: "user" | "country";
  /** Current rank (null = not ranked) */
  rank: number | null;
  score: number | null;
  gap: GapToNext;
  /** Icon / flag + name */
  name: string;
  avatar?: string | null;
  countryCode?: string;
  countryName?: string;
  /** Text shown when not ranked */
  unrankedText: string;
};

/**
 * Bar pinned to the bottom of the ranking screen (right above the bottom navigation on phones)
 * so you always see where you or your country stands while scrolling.
 */
export function MyRankBar(props: Props) {
  const { metric, scope, rank, score, gap } = props;
  return (
    <div
      className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 px-3 md:bottom-4"
      role="region"
      aria-label={scope === "user" ? "あなたの現在順位" : "所属国の現在順位"}
    >
      <div className="mx-auto flex max-w-5xl items-center gap-3 rounded-2xl border border-accent/40 bg-surface-2/95 px-3 py-2.5 shadow-2xl shadow-black/60 backdrop-blur-xl sm:px-4">
        <div className="w-11 shrink-0 text-center">
          {rank !== null ? (
            <RankBadge rank={rank} />
          ) : (
            <span className="text-xs font-semibold text-muted">—</span>
          )}
        </div>

        {scope === "user" ? (
          <Avatar avatar={props.avatar} name={props.name} className="size-9" />
        ) : (
          props.countryCode && <Flag code={props.countryCode} name={props.countryName} className="text-2xl" />
        )}

        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
            {scope === "user" && props.countryCode && <Flag code={props.countryCode} name={props.countryName} />}
            <span className="truncate">{props.name}</span>
            <span className="shrink-0 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
              {scope === "user" ? "あなた" : "所属国"}
            </span>
          </p>
          <p className={cn("text-[11px] leading-snug sm:text-xs", rank === null ? "text-muted" : "text-ink-2")}>
            {rank === null ? (
              props.unrankedText
            ) : gap ? (
              <span>
                <ArrowUp className="mr-0.5 inline size-3 align-[-2px] text-accent" aria-hidden />
                1つ上（{gap.rank}位）まであと{" "}
                <strong className="font-semibold whitespace-nowrap text-ink">{metricText(metric, gap.gap, scope)}</strong>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-gold">
                <Crown className="size-3" aria-hidden />
                現在1位！
              </span>
            )}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[10px] text-muted">{METRIC_LABEL[metric]}</p>
          {score !== null && rank !== null ? (
            <MetricValue metric={metric} value={score} scope={scope} className="text-base font-bold sm:text-lg" />
          ) : (
            <p className="text-sm font-semibold text-muted">未ランク</p>
          )}
        </div>
      </div>
    </div>
  );
}
