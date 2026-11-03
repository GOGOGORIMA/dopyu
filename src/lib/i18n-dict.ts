import type { Lang } from "./i18n";
import type { RankingPeriodKey } from "./ranking-period";
import type { RankingExclusionReason } from "./ranking-rules";

/** Shared translation dictionary (terms used on several screens). */

export const PERIOD_LABELS: Record<Lang, Record<RankingPeriodKey, string>> = {
  ja: { all: "歴代", year: "年間", month: "月間", week: "週間" },
  en: { all: "All-Time", year: "Yearly", month: "Monthly", week: "Weekly" },
};

export type MetricKey = "volume" | "average" | "count";
export const METRIC_LABELS: Record<Lang, Record<MetricKey, string>> = {
  ja: { volume: "総量", average: "平均", count: "総回数" },
  en: { volume: "Volume", average: "Daily Avg", count: "Count" },
};

export const EXCLUSION_LABELS: Record<Lang, Record<RankingExclusionReason, string>> = {
  ja: { over_120min: "120分超過", cooldown: "クールダウン中", daily_limit: "1日5回上限" },
  en: { over_120min: "over 120 min", cooldown: "cooldown", daily_limit: "daily limit (5/day)" },
};

/** "12分34秒" / "12m 34s" */
export function formatDuration(totalSeconds: number, lang: Lang): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (lang === "en") {
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }
  if (h > 0) return `${h}時間${m}分`;
  if (m > 0) return `${m}分${String(sec).padStart(2, "0")}秒`;
  return `${sec}秒`;
}

export function locale(lang: Lang) {
  return lang === "en" ? "en-US" : "ja-JP";
}

const displayNames = new Map<Lang, Intl.DisplayNames | null>();
/** Country name in the UI language. */
export function countryName(code: string, lang: Lang): string {
  if (!displayNames.has(lang)) {
    try {
      displayNames.set(lang, new Intl.DisplayNames([lang], { type: "region", style: "short" }));
    } catch {
      displayNames.set(lang, null);
    }
  }
  try {
    return displayNames.get(lang)?.of(code) ?? code;
  } catch {
    return code;
  }
}

/** English versions of the validation / storage messages (the data layer speaks Japanese). */
const ERROR_EN: [RegExp | string, string][] = [
  ["7日以上前の記録は登録できません", "Records older than 7 days cannot be saved"],
  ["このメールアドレスは既に登録されています", "This email address is already registered"],
  ["このユーザーネームは既に使われています", "This username is already taken"],
  ["アイコンの保存に失敗しました", "Could not save the icon"],
  ["アイコン画像の形式が正しくありません", "Invalid icon image"],
  ["オカズタグを1つ以上選択または入力してください", "Pick or enter at least one sauce tag"],
  ["サーバー上のデータ削除に失敗しました", "Could not delete your data on the server"],
  ["タグの形式が正しくありません", "Invalid tags"],
  ["パスワードが長すぎます（72バイト以内）", "Password is too long (max 72 bytes)"],
  ["パスワードを入力してください", "Enter your password"],
  ["ブラウザの保存領域に書き込めませんでした（プライベートモードや容量不足の可能性があります）", "Could not write to browser storage (private mode or storage full?)"],
  ["プロフィールの作成に失敗しました", "Could not create your profile"],
  ["プロフィールを読み込めませんでした", "Could not load your profile"],
  ["メールアドレスが長すぎます", "Email address is too long"],
  ["メールアドレスの形式が正しくありません", "Invalid email address"],
  ["メールアドレスまたはパスワードが正しくありません", "Wrong email or password"],
  ["メールアドレスを入力してください", "Enter your email address"],
  ["ユーザーネームは20文字以内にしてください", "Username must be 20 characters or fewer"],
  ["ユーザーネームは2文字以上にしてください", "Username must be at least 2 characters"],
  ["ユーザーネームを入力してください", "Enter a username"],
  ["リクエストの形式が正しくありません", "Invalid request"],
  ["ログインが必要です", "Please log in"],
  ["ログインに失敗しました", "Login failed"],
  ["使える文字は文字・数字・_ . - のみです（スペース不可）", "Use letters, numbers, _ . - only (no spaces)"],
  ["入力内容を確認してください", "Please check the form"],
  ["完了日時が未来になっています", "The finish time is in the future"],
  ["所属国が正しくありません", "Invalid country"],
  ["所属国を選択してください", "Select your country"],
  ["既に使われている項目があります", "Some fields are already in use"],
  ["生年月日が正しくありません", "Invalid date of birth"],
  ["生年月日の形式が正しくありません", "Invalid date of birth"],
  ["生年月日を入力してください", "Enter your date of birth"],
  ["画像が大きすぎます（20MBまで）", "Image is too large (max 20 MB)"],
  ["画像のサイズを取得できませんでした", "Could not read the image size"],
  ["画像の変換に失敗しました", "Could not convert the image"],
  ["画像を読み込めませんでした。別の画像を選んでください", "Could not load the image. Try another one"],
  ["画像ファイルを選んでください", "Choose an image file"],
  ["登録に失敗しました", "Sign-up failed"],
  ["確認メールを送信しました。メール内のリンクで認証してからログインしてください", "We sent a confirmation email. Open the link in it, then log in"],
  ["計測データに不整合があるため保存できません（不正なデータの可能性があります）。リセットしてやり直してください", "The timer data is inconsistent (possible tampering) and was not saved. Reset and try again"],
  ["計測時間が長すぎます。リセットしてやり直してください", "The session is too long. Reset and try again"],
  ["記録の削除に失敗しました", "Could not delete the record"],
  ["記録を読み込めませんでした", "Could not load your records"],
  ["URLやドメイン（http, .com など）はユーザーネームに使えません", "Usernames cannot contain URLs or domains (http, .com, etc.)"],
  ["メールアドレスはユーザーネームに使えません", "Usernames cannot contain an email address"],
  ["電話番号のような数字（8桁以上）はユーザーネームに使えません", "Usernames cannot contain phone-number-like digits (8 or more)"],
  ["使用できない言葉が含まれています。別のユーザーネームにしてください", "This username contains a word that is not allowed. Please choose another"],
  ["生年月日が登録されていないため、入力してください", "Your date of birth is not registered yet. Please enter it"],
  ["生年月日の保存に失敗しました", "Could not save your date of birth"],
  ["プリセットのアイコンを選んでください", "Please pick one of the preset icons"],
  ["記録の同期に失敗しました", "Could not sync the record"],
  ["保存に失敗しました", "Could not save"],
  ["削除に失敗しました", "Could not delete"],
  [/^18歳未満の方はご(登録|利用)いただけません$/, "You must be 18 or older to sign up"],
  [/^タグは1回の記録につき(\d+)個までです$/, "Up to $1 tags per record"],
  [/^パスワードは(\d+)文字以上にしてください$/, "Password must be at least $1 characters"],
  [/^(.+)が必要です$/, "Missing value"],
  [/^(.+)の形式が正しくありません$/, "Invalid value"],
];

/** Translates a (Japanese) message from the data layer for display. Unknown messages pass through. */
export function translateMessage(message: string, lang: Lang): string {
  if (lang === "ja") return message;
  for (const [ja, en] of ERROR_EN) {
    if (typeof ja === "string" ? message === ja : ja.test(message)) {
      return typeof ja === "string" ? en : message.replace(ja, en);
    }
  }
  return message;
}

export function translateFieldErrors(errors: Record<string, string>, lang: Lang): Record<string, string> {
  return Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, translateMessage(v, lang)]));
}

/** Device-only notice for okazu tags. Always shown in both languages (current language first). */
export const TAG_PRIVACY_NOTE = {
  ja: "※入力したオカズタグはあなたの端末内にのみ保存され、サーバーには一切送信されません。",
  en: "※Your Sauce Tags are stored only on this device and are never sent to any server.",
} as const;
