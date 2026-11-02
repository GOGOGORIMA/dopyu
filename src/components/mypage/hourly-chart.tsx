"use client";

import { Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Rectangle,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
} from "recharts";

/*
 * Chart colors (dataviz "emphasis" form: one series, peak hour highlighted, other hours de-emphasized)
 * Validated against the dark surface #15151d: both >= 3:1 contrast, normal-vision ΔE 15.4, CVD ΔE 12.2
 */
const ACCENT = "#0aa5c4";
const ACCENT_HOVER = "#2bbcd8";
const MUTED = "#64708a";
const MUTED_HOVER = "#7d89a3";
const GRID = "#2a2a36";
const AXIS_TEXT = "#858597";
const AXIS_LINE = "#383845";

type HourDatum = { hour: number; count: number; isPeak: boolean };

function HourTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
}) {
  const datum = payload?.[0]?.payload as HourDatum | undefined;
  const { t } = useI18n();
  if (!active || !datum) return null;
  return (
    <div className="rounded-xl border border-line-strong bg-surface-2 px-3 py-2 text-sm shadow-xl">
      {/* Value first, label second */}
      <div className="font-bold text-ink tabular-nums">{t(`${datum.count}回`, `${datum.count}x`)}</div>
      <div className="text-xs text-ink-2">
        {datum.hour}:00〜{datum.hour}:59
      </div>
    </div>
  );
}

function BarShape(props: BarShapeProps) {
  const datum = props.payload as HourDatum;
  const fill = datum.isPeak
    ? props.isActive
      ? ACCENT_HOVER
      : ACCENT
    : props.isActive
      ? MUTED_HOVER
      : MUTED;
  return (
    <Rectangle
      x={props.x}
      y={props.y}
      width={props.width}
      height={props.height}
      // Rounded 4px at the data end, square at the baseline
      radius={[4, 4, 0, 0]}
      fill={fill}
    />
  );
}

export function HourlyChart({ hourly }: { hourly: { hour: number; count: number }[] }) {
  const max = Math.max(0, ...hourly.map((h) => h.count));
  const data: HourDatum[] = hourly.map((h) => ({ ...h, isPeak: max > 0 && h.count === max }));
  const peaks = data.filter((d) => d.isPeak);
  const { t } = useI18n();

  return (
    <figure className="space-y-3">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5 font-semibold">
          <Clock className="size-4 text-accent" aria-hidden />
          {t("時間帯別グラフ", "By hour of day (local time)")}
        </span>
        <span className="text-xs text-ink-2">
          {peaks.length > 0 ? (
            <>
              {t("最も多い時間帯:", "Peak hour:")}{" "}
              <strong className="font-semibold text-ink">
                {peaks.map((p) => t(`${p.hour}時台`, `${p.hour}:00`)).join(t("・", ", "))}
              </strong>
              {t(`（${max}回）`, ` (${max}x)`)}
            </>
          ) : (
            t("今年の記録がまだありません", "No sessions this year yet")
          )}
        </span>
      </figcaption>

      <BarChart
        responsive
        data={data}
        className="h-[232px] w-full lg:h-[340px]"
        margin={{ top: 20, right: 4, bottom: 0, left: -18 }}
        barCategoryGap={2}
      >
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis
          dataKey="hour"
          ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
          interval={0}
          tickFormatter={(hour: number) => t(`${hour}時`, `${hour}h`)}
          tickLine={false}
          axisLine={{ stroke: AXIS_LINE }}
          tick={{ fill: AXIS_TEXT, fontSize: 11 }}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          width={44}
          tick={{ fill: AXIS_TEXT, fontSize: 11 }}
        />
        <Tooltip
          content={(props) => <HourTooltip active={props.active} payload={props.payload} />}
          cursor={{ fill: "rgb(255 255 255 / 0.04)" }}
          isAnimationActive={false}
        />
        <Bar dataKey="count" name={t("回数", "Sessions")} maxBarSize={24} shape={BarShape} isAnimationActive={false}>
          {/* Direct label on the peak only (no numbers on every bar) */}
          <LabelList
            dataKey="count"
            position="top"
            content={(props) => {
              const index = Number(props.index);
              if (!data[index]?.isPeak) return null;
              const x = Number(props.x) + Number(props.width) / 2;
              const y = Number(props.y) - 6;
              return (
                <text x={x} y={y} textAnchor="middle" fill="#f2f2f7" fontSize={11} fontWeight={600}>
                  {props.value}
                </text>
              );
            }}
          />
        </Bar>
      </BarChart>

      <details className="group text-xs text-ink-2">
        <summary className="cursor-pointer text-muted select-none hover:text-ink-2">{t("数値で見る", "Show numbers")}</summary>
        <dl className="mt-2 grid grid-cols-4 gap-1 sm:grid-cols-6" aria-label={t("時間帯別の回数", "Sessions by hour")}>
          {data.map((d) => (
            <div key={d.hour} className="flex justify-between rounded-lg bg-bg/60 px-2 py-1">
              <dt className="text-muted">{t(`${d.hour}時`, `${d.hour}h`)}</dt>
              <dd className="font-semibold tabular-nums">{t(`${d.count}回`, `${d.count}x`)}</dd>
            </div>
          ))}
        </dl>
      </details>
    </figure>
  );
}
