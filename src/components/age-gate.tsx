"use client";

import { ShieldAlert } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { PrivacyContent, TermsContent } from "./legal-content";

const AGE_KEY = "dopyu_age_verified";
const listeners = new Set<() => void>();

function readVerified(): boolean {
  try {
    return window.localStorage.getItem(AGE_KEY) === "true";
  } catch {
    return false;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Full-screen 18+ confirmation shown on any page until the visitor agrees.
 * The rest of the page is made inert (not clickable / focusable) while it is open.
 */
export function AgeGate() {
  // null on the server / during hydration, then true or false
  const verified = useSyncExternalStore(subscribe, readVerified, () => null);
  const open = verified === false;

  useEffect(() => {
    const root = document.getElementById("app-root");
    if (!root) return;
    if (open) {
      root.setAttribute("inert", "");
      document.body.style.overflow = "hidden";
    } else {
      root.removeAttribute("inert");
      document.body.style.overflow = "";
    }
  }, [open]);

  if (!open) return null;

  function agree() {
    try {
      window.localStorage.setItem(AGE_KEY, "true");
    } catch {
      // storage unavailable: still let the visitor in for this page view
    }
    for (const l of listeners) l();
    // In case storage is blocked, hide the overlay manually
    if (!readVerified()) document.getElementById("age-gate")?.remove();
  }

  return (
    <div
      id="age-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xl"
    >
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-line-strong bg-surface shadow-2xl">
        <div className="space-y-3 overflow-y-auto p-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-6 text-pink" aria-hidden />
            <h2 id="age-gate-title" className="text-xl font-bold">
              年齢確認（18歳以上対象）
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-2">
            DOPYUは成人向けのヘルスケア・エンターテインメント記録アプリです。18歳未満の方（高校生を含む）はご利用いただけません。また、ご利用にあたっては利用規約および免責事項に同意したものとみなします。
          </p>
          <details className="rounded-2xl border border-line bg-bg/60 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-accent">利用規約・免責事項を読む</summary>
            <div className="mt-3">
              <TermsContent />
            </div>
          </details>
          <details className="rounded-2xl border border-line bg-bg/60 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-accent">プライバシーポリシーを読む</summary>
            <div className="mt-3">
              <PrivacyContent />
            </div>
          </details>
        </div>
        <div className="grid gap-2 border-t border-line p-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={agree}
            autoFocus
            className="h-12 rounded-xl bg-accent text-sm font-bold text-accent-ink transition hover:brightness-110"
          >
            18歳以上です（同意して入る）
          </button>
          <button
            type="button"
            onClick={() => window.location.replace("https://www.google.com")}
            className="h-12 rounded-xl border border-line text-sm font-semibold text-ink-2 transition hover:bg-surface-2"
          >
            18歳未満です（退出する）
          </button>
        </div>
      </div>
    </div>
  );
}
