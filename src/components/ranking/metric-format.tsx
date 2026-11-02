"use client";

import { cn } from "@/lib/cn";
import { useI18n, type Lang } from "@/lib/i18n";
import type { RankingMetric } from "@/lib/ranking";

/** Number + unit for a ranking metric. Personal average is ml/日, country average is ml/人. */
export function metricParts(metric: RankingMetric, value: number, scope: "user" | "country", lang: Lang = "ja") {
  const loc = lang === "en" ? "en-US" : "ja-JP";
  if (metric === "count") return { number: value.toLocaleString(loc), unit: lang === "en" ? "x" : "回" };
  if (metric === "average") {
    const digits = scope === "user" ? 2 : 1;
    const unit = scope === "user" ? (lang === "en" ? "ml/day" : "ml/日") : lang === "en" ? "ml/user" : "ml/人";
    return { number: value.toLocaleString(loc, { minimumFractionDigits: digits, maximumFractionDigits: digits }), unit };
  }
  return { number: value.toLocaleString(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), unit: "ml" };
}

export function metricText(metric: RankingMetric, value: number, scope: "user" | "country", lang: Lang = "ja") {
  const { number, unit } = metricParts(metric, value, scope, lang);
  return `${number}${unit}`;
}

export function MetricValue({
  metric,
  value,
  scope,
  className,
  unitClassName,
}: {
  metric: RankingMetric;
  value: number;
  scope: "user" | "country";
  className?: string;
  unitClassName?: string;
}) {
  const { lang } = useI18n();
  const { number, unit } = metricParts(metric, value, scope, lang);
  return (
    <span className={cn("whitespace-nowrap tabular-nums", className)}>
      {number}
      <span className={cn("ml-0.5 text-xs font-normal text-muted", unitClassName)}>{unit}</span>
    </span>
  );
}

/** Column order matches the sort switch: 総量 / 平均 / 総回数 */
export const METRIC_COLUMNS: RankingMetric[] = ["volume", "average", "count"];

/**
 * On phones only two value columns fit: the selected metric plus one companion
 * (総量, or 平均 when 総量 itself is selected). Wider screens show all three.
 */
export function metricColumnClass(column: RankingMetric, selected: RankingMetric): string {
  const companion: RankingMetric = selected === "volume" ? "average" : "volume";
  return column === selected || column === companion ? "" : "hidden sm:table-cell";
}
