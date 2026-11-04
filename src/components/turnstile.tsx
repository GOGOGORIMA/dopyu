"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";

/**
 * Cloudflare Turnstile ("I'm not a robot") widget, loaded on demand from challenges.cloudflare.com.
 *
 * Site key: NEXT_PUBLIC_TURNSTILE_SITE_KEY, or Cloudflare's official always-pass test key while unset
 * (local dev / GitHub Pages), so the widget is visible and works everywhere.
 * The test key only produces dummy tokens: with Supabase CAPTCHA protection on, set the real key.
 *
 * onToken(token) receives the verification token, and onToken(null) whenever it is no longer valid
 * (expired, error, timeout, language change, unmount). Tokens are single-use: bump `resetSignal`
 * after a failed submit to get a fresh one.
 */
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || TURNSTILE_TEST_SITE_KEY;
export const isTurnstileTestKey = TURNSTILE_SITE_KEY === TURNSTILE_TEST_SITE_KEY;

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId?: string): void;
  remove(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loader: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loader ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile unavailable")));
    script.onerror = () => {
      loader = null;
      script.remove();
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return loader;
}

export function Turnstile({
  onToken,
  action,
  resetSignal = 0,
  className,
}: {
  onToken: (token: string | null) => void;
  /** Shown in Cloudflare analytics (e.g. "signup", "login") */
  action?: string;
  /** Change this number to reset the widget (e.g. after a failed submit) */
  resetSignal?: number;
  className?: string;
}) {
  const { lang, t } = useI18n();
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  // (Re)render on mount, on language change and on retry
  useEffect(() => {
    let cancelled = false;
    const emit = (token: string | null) => onTokenRef.current(token);
    loadTurnstile()
      .then((api) => {
        if (cancelled || !container.current) return;
        setFailed(false);
        widgetId.current = api.render(container.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          language: lang,
          theme: "dark",
          size: "flexible",
          callback: (token: string) => emit(token),
          "expired-callback": () => emit(null),
          "timeout-callback": () => emit(null),
          "error-callback": () => {
            emit(null);
            // Returning false lets Turnstile show its own error state and retry
            return false;
          },
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      emit(null);
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [lang, action, attempt]);

  // Fresh token after a failed submit (a token can only be verified once)
  useEffect(() => {
    if (resetSignal === 0 || !widgetId.current || !window.turnstile) return;
    onTokenRef.current(null);
    window.turnstile.reset(widgetId.current);
  }, [resetSignal]);

  return (
    <div className={cn("min-h-[65px]", className)}>
      <div ref={container} />
      {failed && (
        <p role="alert" className="flex flex-wrap items-center gap-2 rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
          {t("ボット対策の確認を読み込めませんでした。", "Could not load the bot check.")}
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            {t("再読み込み", "Retry")}
          </button>
        </p>
      )}
    </div>
  );
}
