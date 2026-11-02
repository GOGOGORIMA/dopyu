"use client";

import { Cake, Droplet, Globe, KeyRound, LoaderCircle, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { MIN_AGE, MIN_PASSWORD_LENGTH } from "@/lib/constants";
import type { CountryOption } from "@/lib/countries";
import { DUMMY_USERS } from "@/lib/dummy-data";
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

export function RegisterForm({ countries }: { countries: CountryOption[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Preview>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
        },
        // Built-in ranking users' names cannot be taken
        DUMMY_USERS.map((u) => u.username),
      );
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
      setFieldErrors(err instanceof FormError ? err.fieldErrors : {});
      setPending(false);
    }
  }

  const invalid = (name: string) => (fieldErrors[name] ? true : undefined);

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <h1 className="text-xl font-bold">新規登録</h1>
        <p className="mt-1 text-sm text-ink-2">{MIN_AGE}歳以上の方のみご利用いただけます。</p>
      </div>

      <Field label="メールアドレス（ログインID）" htmlFor="email" error={fieldErrors.email} icon={<Mail className="size-4" aria-hidden />}>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required aria-invalid={invalid("email")} className={inputClass} placeholder="you@example.com" />
      </Field>

      <Field
        label="パスワード"
        htmlFor="password"
        error={fieldErrors.password}
        hint={`${MIN_PASSWORD_LENGTH}文字以上`}
        icon={<KeyRound className="size-4" aria-hidden />}
      >
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} aria-invalid={invalid("password")} className={inputClass} />
      </Field>

      <Field
        label="ユーザーネーム（ランキングに表示）"
        htmlFor="username"
        error={fieldErrors.username}
        hint="2〜20文字。文字・数字・_ . - が使えます"
        icon={<UserRound className="size-4" aria-hidden />}
      >
        <input id="username" name="username" type="text" autoComplete="username" required maxLength={20} aria-invalid={invalid("username")} className={inputClass} placeholder="dopyu_taro" />
      </Field>

      <Field
        label="生年月日"
        htmlFor="birthDate"
        error={fieldErrors.birthDate}
        hint={
          preview ? (
            <span className="inline-flex items-center gap-1 text-ink-2">
              <Droplet className="size-3.5 text-accent" aria-hidden />
              {preview.age}歳 → 1回あたりの推定量 <strong className="text-ink">{preview.volumeMl.toFixed(1)}ml</strong>
            </span>
          ) : (
            "年齢から1回あたりの推定量（ml）を自動で設定します"
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

      <Field label="所属国" htmlFor="countryCode" error={fieldErrors.countryCode} icon={<Globe className="size-4" aria-hidden />}>
        <select id="countryCode" name="countryCode" defaultValue="JP" aria-invalid={invalid("countryCode")} className={`${inputClass} appearance-auto`}>
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}（{country.code}）
            </option>
          ))}
        </select>
      </Field>

      {error && (
        <p role="alert" className="rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-bold text-accent-ink transition hover:brightness-110 disabled:opacity-60"
      >
        {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        登録してはじめる
      </button>

      <p className="text-center text-sm text-ink-2">
        登録済みの方は{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          ログイン
        </Link>
      </p>
    </form>
  );
}
