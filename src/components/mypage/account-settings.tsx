"use client";

import { LoaderCircle, Settings, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteAccount } from "@/lib/local-db";
import { isSupabaseEnabled } from "@/lib/supabase";

/** Settings: links to the legal pages and "delete all data and leave". */
export function AccountSettings() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const where = isSupabaseEnabled ? "このブラウザとサーバー上" : "このブラウザ";
    if (!window.confirm(`アカウントと${where}の全記録・アイコン・タグを完全に削除して退会します。\nこの操作は取り消せません。よろしいですか？`)) return;
    if (!window.confirm("本当に削除しますか？（最終確認）")) return;
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
        設定
      </h2>
      <ul className="mt-3 space-y-1 text-sm">
        <li>
          <Link href="/legal#terms" className="text-ink-2 hover:text-ink hover:underline">
            利用規約・免責事項
          </Link>
        </li>
        <li>
          <Link href="/legal#privacy" className="text-ink-2 hover:text-ink hover:underline">
            プライバシーポリシー
          </Link>
        </li>
      </ul>
      <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
        <p className="text-sm font-semibold text-red-200">アカウントの削除（退会）</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-2">
          プロフィール・アイコン・すべての記録とオカズタグを完全に削除します。
          {isSupabaseEnabled ? "サーバー上のデータも削除されます。" : ""}削除したデータは元に戻せません。
        </p>
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-xl bg-red-500/15 px-4 text-sm font-semibold text-red-200 ring-1 ring-red-500/40 transition hover:bg-red-500/25 disabled:opacity-60"
        >
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
          全データを削除して退会する
        </button>
      </div>
    </section>
  );
}
