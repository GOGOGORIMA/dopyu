/**
 * Converts an estimated volume (ml) into a familiar unit for sharing.
 *   < 15 ml        大さじ 約N杯分                (15 ml)
 *   15 - < 100 ml  乳酸菌飲料 約N本分            (65 ml, 2 decimals)
 *   100 - < 500 ml 栄養ドリンク 約N本分          (120 ml)
 *   >= 500 ml      500mlペットボトル 約N本分
 */
export function toFriendlyUnit(ml: number): string {
  const v = Math.max(0, ml);
  if (v < 15) return `大さじ 約${(v / 15).toFixed(1)}杯分`;
  if (v < 100) return `乳酸菌飲料 約${(v / 65).toFixed(2)}本分`;
  if (v < 500) return `栄養ドリンク 約${(v / 120).toFixed(1)}本分`;
  return `500mlペットボトル 約${(v / 500).toFixed(1)}本分`;
}

/** Public URL of the app (NEXT_PUBLIC_SITE_URL, or the current origin + base path). */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured;
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`;
}

export const SHARE_HASHTAGS = "#DOPYU #射精ワールドカップ";

/** X (Twitter) web intent URL for the given text (the site URL is appended automatically). */
export function xShareUrl(text: string): string {
  const params = new URLSearchParams({ text, url: getSiteUrl() });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

const formatMl = (ml: number) => ml.toLocaleString("ja-JP", { maximumFractionDigits: 1 });

export function recordShareText(durationText: string, volumeMl: number, yearTotalMl: number): string {
  return `【DOPYU 記録完了】今回の記録：${durationText}（推定${formatMl(volumeMl)}ml） / 今年の累計：${formatMl(yearTotalMl)}ml（${toFriendlyUnit(yearTotalMl)}） ${SHARE_HASHTAGS}`;
}

export function rankShareText(periodLabel: string, scopeLabel: string, rank: number, totalVolumeMl: number): string {
  return `【DOPYU 射精競技】現在の${periodLabel}${scopeLabel}ランキング：第${rank}位！ 総量：${formatMl(totalVolumeMl)}ml（${toFriendlyUnit(totalVolumeMl)}） ${SHARE_HASHTAGS}`;
}
