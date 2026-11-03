import { Lock } from "lucide-react";
import Link from "next/link";
import { AuthGate } from "@/components/auth-gate";
import { Logo } from "@/components/brand/logo";
import { LanguageToggle, T } from "@/lib/i18n";
import { isSupabaseEnabled } from "@/lib/supabase";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-10">
      <LanguageToggle className="absolute top-4 right-4" />
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <Logo size="lg" />
        <p className="text-sm text-ink-2">
          <T ja="記録して、比べて、知る。年間ランキングで世界と競おう。" en="Global Ejaculation Championship & Tracker" />
        </p>
      </div>
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-2xl shadow-black/40 sm:p-8">
        <AuthGate mode="guest">{children}</AuthGate>
      </div>
      <p className="mt-6 flex max-w-md items-start gap-1.5 text-xs leading-relaxed text-muted">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          {isSupabaseEnabled ? (
            <T
              ja="ランキングの集計に必要な記録（記録日時・計測時間・推定量）はサーバーに保存されます。オカズタグはお使いの端末内にのみ保存され、サーバーには送信されません。"
              en="Records needed for the rankings (date and time, duration and estimated volume) are stored on our server. Sauce Tags are stored only on your device and are never sent to the server."
            />
          ) : (
            <T
              ja="現在のバージョンでは、アカウント情報と記録はお使いのブラウザ内に保存され、当サービスのサーバーには送信されません。"
              en="In the current version, your account and records are stored in your browser and are not sent to our servers."
            />
          )}{" "}
          <Link href="/legal#privacy" className="underline underline-offset-2 hover:text-ink-2">
            <T ja="詳しくはプライバシーポリシーをご確認ください。" en="See the Privacy Policy for details." />
          </Link>
        </span>
      </p>
    </main>
  );
}
