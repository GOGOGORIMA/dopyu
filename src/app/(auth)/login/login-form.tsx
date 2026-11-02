"use client";

import { KeyRound, LoaderCircle, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { generateDemoEntries } from "@/lib/dummy-data";
import { FormError, loginAsDemo, loginUser } from "@/lib/local-db";

/** Only allow same-site relative paths after login (prevents open redirects). */
function safeNextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      await loginUser({ email: form.get("email"), password: form.get("password") });
      router.replace(safeNextPath());
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
      setFieldErrors(err instanceof FormError ? err.fieldErrors : {});
      setPending(false);
    }
  }

  async function handleDemo() {
    setPending(true);
    setError(null);
    try {
      await loginAsDemo((birthDate) => generateDemoEntries(birthDate));
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "デモの準備に失敗しました");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <h1 className="text-xl font-bold">ログイン</h1>
        <p className="mt-1 text-sm text-ink-2">メールアドレスとパスワードを入力してください。</p>
      </div>

      <Field label="メールアドレス" htmlFor="email" error={fieldErrors.email} icon={<Mail className="size-4" aria-hidden />}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-invalid={fieldErrors.email ? true : undefined}
          className={inputClass}
          placeholder="you@example.com"
        />
      </Field>

      <Field label="パスワード" htmlFor="password" error={fieldErrors.password} icon={<KeyRound className="size-4" aria-hidden />}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={fieldErrors.password ? true : undefined}
          className={inputClass}
        />
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
        ログイン
      </button>

      <button
        type="button"
        onClick={handleDemo}
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface-2 text-sm font-semibold text-ink transition hover:bg-surface-3 disabled:opacity-60"
      >
        <Sparkles className="size-4 text-violet" aria-hidden />
        デモアカウントで試す（サンプル記録つき）
      </button>

      <p className="text-center text-sm text-ink-2">
        アカウントをお持ちでない方は{" "}
        <Link href="/register" className="font-semibold text-accent hover:underline">
          新規登録
        </Link>
      </p>
    </form>
  );
}
