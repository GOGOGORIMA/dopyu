import { z } from "zod";
import {
  MAX_COMPLETED_AT_AGE_MS,
  MAX_DURATION_SECONDS,
  MIN_AGE,
  MIN_PASSWORD_LENGTH,
} from "./constants";
import { isCountryCode } from "./countries";
import { MAX_TAGS_PER_ENTRY, normalizeTagList } from "./tags";
import { calculateAge } from "./volume";

export { MIN_RANKABLE_SECONDS } from "./constants";

/** Tolerance for client clocks running ahead. */
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

const emailSchema = z
  .string({ error: "メールアドレスを入力してください" })
  .trim()
  .toLowerCase()
  .max(254, { error: "メールアドレスが長すぎます" })
  .pipe(z.email({ error: "メールアドレスの形式が正しくありません" }));

const utf8 = new TextEncoder();

const passwordSchema = z
  .string({ error: "パスワードを入力してください" })
  .min(MIN_PASSWORD_LENGTH, { error: `パスワードは${MIN_PASSWORD_LENGTH}文字以上にしてください` })
  // bcrypt only uses the first 72 bytes, so reject anything longer
  .refine((value) => utf8.encode(value).length <= 72, {
    error: "パスワードが長すぎます（72バイト以内）",
  });

const usernameSchema = z
  .string({ error: "ユーザーネームを入力してください" })
  .transform((value) => value.normalize("NFKC").trim())
  .pipe(
    z
      .string()
      .min(2, { error: "ユーザーネームは2文字以上にしてください" })
      .max(20, { error: "ユーザーネームは20文字以内にしてください" })
      .regex(/^[\p{L}\p{N}_.-]+$/u, {
        error: "使える文字は文字・数字・_ . - のみです（スペース不可）",
      }),
  );

const birthDateSchema = z
  .string({ error: "生年月日を入力してください" })
  .pipe(z.iso.date({ error: "生年月日の形式が正しくありません" }))
  .transform((value) => new Date(`${value}T00:00:00.000Z`))
  .refine((date) => !Number.isNaN(date.getTime()) && date.getTime() < Date.now(), {
    error: "生年月日が正しくありません",
  })
  .refine((date) => calculateAge(date) >= MIN_AGE, {
    error: `${MIN_AGE}歳未満の方はご利用いただけません`,
  })
  .refine((date) => calculateAge(date) <= 120, { error: "生年月日が正しくありません" });

const BODY_ERROR = { error: "リクエストの形式が正しくありません" };

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  birthDate: birthDateSchema,
  countryCode: z
    .string({ error: "所属国を選択してください" })
    .trim()
    .toUpperCase()
    .refine(isCountryCode, { error: "所属国が正しくありません" }),
}, BODY_ERROR);

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: "パスワードを入力してください" }).min(1, {
    error: "パスワードを入力してください",
  }),
}, BODY_ERROR);

export const createEntrySchema = z.object({
  completedAt: z
    .string({ error: "完了日時が必要です" })
    .pipe(z.iso.datetime({ offset: true, error: "完了日時の形式が正しくありません" }))
    .transform((value) => new Date(value))
    .refine((date) => date.getTime() <= Date.now() + FUTURE_TOLERANCE_MS, {
      error: "完了日時が未来になっています",
    })
    .refine((date) => date.getTime() >= Date.now() - MAX_COMPLETED_AT_AGE_MS, {
      error: "7日以上前の記録は登録できません",
    }),
  durationSeconds: z
    .number({ error: "計測時間が必要です" })
    .int({ error: "計測時間が正しくありません" })
    .min(0, { error: "計測時間が正しくありません" })
    .max(MAX_DURATION_SECONDS, {
      error: "計測時間が24時間を超えています。リセットしてやり直してください",
    }),
  tags: z
    .array(z.string().max(200), { error: "タグの形式が正しくありません" })
    .max(50)
    .default([])
    .transform(normalizeTagList)
    .refine((tags) => tags.length <= MAX_TAGS_PER_ENTRY, {
      error: `タグは1回の記録につき${MAX_TAGS_PER_ENTRY}個までです`,
    }),
}, BODY_ERROR);

export type CreateEntryInput = z.infer<typeof createEntrySchema>;

export const RANKING_TYPES = ["japan", "world", "worldcup"] as const;
export type RankingType = (typeof RANKING_TYPES)[number];

export const WORLD_CUP_SORTS = ["average", "volume"] as const;
export type WorldCupSort = (typeof WORLD_CUP_SORTS)[number];

export function parseRankingType(value: unknown): RankingType {
  return RANKING_TYPES.includes(value as RankingType) ? (value as RankingType) : "japan";
}

export function parseWorldCupSort(value: unknown): WorldCupSort {
  return WORLD_CUP_SORTS.includes(value as WorldCupSort) ? (value as WorldCupSort) : "average";
}

/** Parses "YYYY-MM". Returns null when invalid. */
export function parseYearMonth(value: unknown): { year: number; month: number } | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  if (year < 1970 || year > 9999) return null;
  return { year, month: Number(match[2]) };
}

/** Flattens a Zod error into a map of field name to first message. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "_form";
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}
