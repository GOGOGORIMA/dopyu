"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** The browser's IANA time zone. null on the server and during hydration (browser-only value). */
export function useBrowserTimeZone(): string | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    () => null,
  );
}

type FetchState<T> = { key: string | null; data: T | null; error: string | null };

/**
 * Minimal JSON fetch hook.
 * - Keeps the previous data while the URL changes (reloads keep the frame instead of flashing a skeleton)
 * - Sends the user to login on 401
 * - Bump `version` to refetch
 */
export function useJson<T>(url: string | null, version = 0) {
  const router = useRouter();
  const key = url ? `${url}#${version}` : null;
  const [state, setState] = useState<FetchState<T>>({ key: null, data: null, error: null });

  useEffect(() => {
    if (!url || !key) return;
    const controller = new AbortController();
    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login?next=/mypage");
          return;
        }
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "読み込みに失敗しました");
        setState({ key, data: body as T, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState((prev) => ({
          key,
          data: prev.data,
          error: error instanceof Error ? error.message : "読み込みに失敗しました",
        }));
      });
    return () => controller.abort();
  }, [url, key, router]);

  return {
    data: state.data,
    error: state.key === key ? state.error : null,
    loading: key !== null && state.key !== key,
  };
}
