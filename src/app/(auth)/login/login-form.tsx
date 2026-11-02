"use client";

import { KeyRound, LoaderCircle, Mail } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Field, inputClass } from "@/components/ui/field";

/** Only allow same-site relative paths after login (prevents open redirects). */
function safeNextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

export function LoginForm() {
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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "ログインに失敗しました");
        setFieldErrors(data.fieldErrors ?? {});
        setPending(false);
        return;
      }
      // Full navigation so every screen is re-rendered with the new session
      // (a client-side refresh would re-prefetch auth pages, which the proxy then redirects)
      window.location.replace(safeNextPath());
    } catch {
      setError("通信に失敗しました。もう一度お試しください。");
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

      <p className="text-center text-sm text-ink-2">
        アカウントをお持ちでない方は{" "}
        <Link href="/register" className="font-semibold text-accent hover:underline">
          新規登録
        </Link>
      </p>
    </form>
  );
}
