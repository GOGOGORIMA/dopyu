"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";

/**
 * Japanese / English switching without changing URLs (static export friendly).
 * - First visit: navigator.language starting with "ja" -> ja, anything else -> en (saved to localStorage)
 * - The choice is shared between tabs and survives reloads.
 */
export type Lang = "ja" | "en";

const STORAGE_KEY = "dopyu_lang";
const listeners = new Set<() => void>();
let memory: Lang | null = null;

function detect(): Lang {
  return typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("ja") ? "ja" : "en";
}

function readLang(): Lang {
  if (memory) return memory;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "ja" || stored === "en") return (memory = stored);
    const detected = detect();
    window.localStorage.setItem(STORAGE_KEY, detected);
    return (memory = detected);
  } catch {
    return (memory = detect());
  }
}

export function setLang(lang: Lang) {
  memory = lang;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // keep in memory only
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      memory = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

type I18n = {
  lang: Lang;
  /** Picks the string for the current language */
  t: (ja: string, en: string) => string;
  setLang: (lang: Lang) => void;
};

const LanguageContext = createContext<I18n | null>(null);

/** Provides the current language to the whole app (server render / hydration use Japanese). */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readLang, () => "ja" as Lang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const value = useMemo<I18n>(() => ({ lang, setLang, t: (ja, en) => (lang === "en" ? en : ja) }), [lang]);
  return <LanguageContext value={value}>{children}</LanguageContext>;
}

export function useI18n(): I18n {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used inside LanguageProvider");
  return ctx;
}

/** Inline bilingual text, usable from Server Components: <T ja="ログイン" en="Log in" /> */
export function T({ ja, en }: { ja: string; en: string }) {
  return <>{useI18n().t(ja, en)}</>;
}

/** "🇯🇵 JP / 🌐 EN" toggle. */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang } = useI18n();
  const item = (value: Lang, label: string, flag: string) => (
    <button
      type="button"
      onClick={() => setLang(value)}
      aria-pressed={lang === value}
      className={`rounded-full px-2 py-1 text-[11px] font-bold transition ${
        lang === value ? "bg-surface-3 text-ink" : "text-muted hover:text-ink-2"
      }`}
    >
      <span aria-hidden>{flag}</span> {label}
    </button>
  );
  return (
    <div role="group" aria-label="Language / 言語" className={`inline-flex shrink-0 rounded-full border border-line bg-surface p-0.5 ${className}`}>
      {item("ja", "JP", "🇯🇵")}
      {item("en", "EN", "🌐")}
    </div>
  );
}
