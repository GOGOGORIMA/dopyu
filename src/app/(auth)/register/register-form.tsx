"use client";

import { Cake, Droplet, Globe, KeyRound, LoaderCircle, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AvatarPicker } from "@/components/avatar-picker";
import { Turnstile } from "@/components/turnstile";
import { Field, inputClass } from "@/components/ui/field";
import { MIN_AGE, MIN_PASSWORD_LENGTH } from "@/lib/constants";
import type { CountryOption } from "@/lib/countries";
import { DUMMY_USERS } from "@/lib/dummy-data";
import { useI18n } from "@/lib/i18n";
import { translateFieldErrors, translateMessage } from "@/lib/i18n-dict";
import { FormError, registerUser } from "@/lib/local-db";
import { calculateAge, estimateVolumeMlByAge } from "@/lib/volume";

type Preview = { age: number; volumeMl: number } | null;

function previewFromBirthDate(value: string): Preview {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const birthDate = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(birthDate.getTime())) return null;
  const age = calculateAge(birthDate, new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);
  if (age < 0 || age > 120) return null;
  return { age, volumeMl: estimateVolumeMlByAge(age) };
}

export function RegisterForm({ countries }: { countries: Record<"ja" | "en", CountryOption[]> }) {
  const { lang, t } = useI18n();
  const [country, setCountry] = useState<string | null>(null);
  const selectedCountry = country ?? (lang === "en" ? "US" : "JP");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Preview>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  // Cloudflare Turnstile: the submit button stays locked until a token is issued
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!captchaToken) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      await registerUser(
        {
          email: form.get("email"),
          password: form.get("password"),
          username: form.get("username"),
          birthDate: form.get("birthDate"),
          countryCode: form.get("countryCode"),
          captchaToken,
        },
        // Built-in ranking users' names cannot be taken
        DUMMY_USERS.map((u) => u.username),
        avatar,
      );
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
      setFieldErrors(err instanceof FormError ? err.fieldErrors : {});
      setPending(false);
      // A token can only be verified once: get a fresh one for the next attempt
      setCaptchaReset((n) => n + 1);
    }
  }

  // Client-side lock: block under-18 birth dates right away (the same rule runs again on submit)
  const underage = preview !== null && preview.age < MIN_AGE;
  const shownErrors = translateFieldErrors(fieldErrors, lang);
  const birthDateError = underage ? t("18歳未満の方はご登録いただけません", "You must be 18 or older to sign up") : shownErrors.birthDate;
  const invalid = (name: string) => (fieldErrors[name] || (name === "birthDate" && underage) ? true : undefined);

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <h1 className="text-xl font-bold">{t("新規登録", "Sign up")}</h1>
        <p className="mt-1 text-sm text-ink-2">{t(`${MIN_AGE}歳以上の方のみご利用いただけます。`, `For adults aged ${MIN_AGE}+ only.`)}</p>
      </div>

      <Field label={t("メールアドレス（ログインID）", "Email (login ID)")} htmlFor="email" error={shownErrors.email} icon={<Mail className="size-4" aria-hidden />}>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required aria-invalid={invalid("email")} className={inputClass} placeholder="you@example.com" />
      </Field>

      <Field
        label={t("パスワード", "Password")}
        htmlFor="password"
        error={shownErrors.password}
        hint={t(`${MIN_PASSWORD_LENGTH}文字以上`, `At least ${MIN_PASSWORD_LENGTH} characters`)}
        icon={<KeyRound className="size-4" aria-hidden />}
      >
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} aria-invalid={invalid("password")} className={inputClass} />
      </Field>

      <Field
        label={t("ユーザーネーム（ランキングに表示）", "Username (shown in rankings)")}
        htmlFor="username"
        error={shownErrors.username}
        hint={t("2〜20文字。文字・数字・_ . - が使えます", "2-20 characters: letters, numbers, _ . -")}
        icon={<UserRound className="size-4" aria-hidden />}
      >
        <input id="username" name="username" type="text" autoComplete="username" required maxLength={20} aria-invalid={invalid("username")} className={inputClass} placeholder="dopyu_taro" />
      </Field>

      <fieldset className="space-y-1.5">
        <legend className="mb-1.5 text-sm font-medium text-ink-2">
          {t("アイコン", "Icon")}{" "}
          <span className="text-xs font-normal text-muted">
            {t("（任意・あとでマイページから変更できます）", "(optional, can be changed later on My Page)")}
          </span>
        </legend>
        <AvatarPicker value={avatar} onChange={setAvatar} name={t("あなた", "You")} />
      </fieldset>

      <Field
        label={t("生年月日", "Date of birth")}
        htmlFor="birthDate"
        error={birthDateError}
        hint={
          preview ? (
            <span className="inline-flex items-center gap-1 text-ink-2">
              <Droplet className="size-3.5 text-accent" aria-hidden />
              {t(`${preview.age}歳 → 1回あたりの推定量`, `Age ${preview.age} → est. volume per session`)}{" "}
              <strong className="text-ink">{preview.volumeMl.toFixed(1)}ml</strong>
            </span>
          ) : (
            t("年齢から1回あたりの推定量（ml）を自動で設定します", "Your estimated volume (ml) per session is set from your age")
          )
        }
        icon={<Cake className="size-4" aria-hidden />}
      >
        <input
          id="birthDate"
          name="birthDate"
          type="date"
          required
          min="1900-01-01"
          aria-invalid={invalid("birthDate")}
          onChange={(e) => setPreview(previewFromBirthDate(e.target.value))}
          className={`${inputClass} [color-scheme:dark]`}
        />
      </Field>

      <Field label={t("所属国", "Country")} htmlFor="countryCode" error={shownErrors.countryCode} icon={<Globe className="size-4" aria-hidden />}>
        <select
          id="countryCode"
          name="countryCode"
          value={selectedCountry}
          onChange={(e) => setCountry(e.target.value)}
          aria-invalid={invalid("countryCode")}
          className={`${inputClass} appearance-auto`}
        >
          {countries[lang].map((option) => (
            <option key={option.code} value={option.code}>
              {option.name} ({option.code})
            </option>
          ))}
        </select>
      </Field>

      {error && (
        <p role="alert" className="rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
          {translateMessage(error, lang)}
        </p>
      )}

      <Turnstile action="signup" onToken={setCaptchaToken} resetSignal={captchaReset} />

      <button
        type="submit"
        disabled={pending || underage || !captchaToken}
        title={captchaToken ? undefined : t("「ロボットではありません」の確認を完了してください", "Complete the \"I'm not a robot\" check first")}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-bold text-accent-ink transition hover:brightness-110 disabled:opacity-60"
      >
        {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        {t("登録してはじめる", "Sign up & start")}
      </button>

      <p className="text-center text-sm text-ink-2">
        {t("登録済みの方は", "Already have an account?")}{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          {t("ログイン", "Log in")}
        </Link>
      </p>
    </form>
  );
}
