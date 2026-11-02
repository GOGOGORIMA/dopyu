"use client";

import { LoaderCircle, Settings, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { translateMessage } from "@/lib/i18n-dict";
import { deleteAccount } from "@/lib/local-db";
import { isSupabaseEnabled } from "@/lib/supabase";

/** Settings: links to the legal pages and "delete all data and leave". */
export function AccountSettings() {
  const router = useRouter();
  const { lang, t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const where = isSupabaseEnabled ? t("このブラウザとサーバー上", "this browser and the server") : t("このブラウザ", "this browser");
    const first = t(
      `アカウントと${where}の全記録・アイコン・タグを完全に削除して退会します。\nこの操作は取り消せません。よろしいですか？`,
      `This permanently deletes your account and every record, icon and tag in ${where}.\nThis cannot be undone. Continue?`,
    );
    if (!window.confirm(first)) return;
    if (!window.confirm(t("本当に削除しますか？（最終確認）", "Really delete everything? (final confirmation)"))) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="settings-title" className="rounded-3xl border border-line bg-surface p-5">
      <h2 id="settings-title" className="flex items-center gap-1.5 font-semibold">
        <Settings className="size-4 text-muted" aria-hidden />
        {t("設定", "Settings")}
      </h2>
      <ul className="mt-3 space-y-1 text-sm">
        <li>
          <Link href="/legal#terms" className="text-ink-2 hover:text-ink hover:underline">
            {t("利用規約・免責事項", "Terms & Disclaimer")}
          </Link>
        </li>
        <li>
          <Link href="/legal#privacy" className="text-ink-2 hover:text-ink hover:underline">
            {t("プライバシーポリシー", "Privacy Policy")}
          </Link>
        </li>
      </ul>
      <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
        <p className="text-sm font-semibold text-red-200">{t("アカウントの削除（退会）", "Delete account")}</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-2">
          {t("プロフィール・アイコン・すべての記録とオカズタグを完全に削除します。", "Permanently deletes your profile, icon, every record and all sauce tags. ")}
          {isSupabaseEnabled ? t("サーバー上のデータも削除されます。", "Server data is deleted too. ") : ""}
          {t("削除したデータは元に戻せません。", "This cannot be undone.")}
        </p>
        {error && <p className="mt-2 text-xs text-red-300">{translateMessage(error, lang)}</p>}
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-xl bg-red-500/15 px-4 text-sm font-semibold text-red-200 ring-1 ring-red-500/40 transition hover:bg-red-500/25 disabled:opacity-60"
        >
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
          {t("全データを削除して退会する", "Delete all data & leave")}
        </button>
      </div>
    </section>
  );
}
