import { Lock } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <Logo size="lg" />
        <p className="text-sm text-ink-2">記録して、比べて、知る。年間ランキングで世界と競おう。</p>
      </div>
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-2xl shadow-black/40 sm:p-8">
        {children}
      </div>
      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted">
        <Lock className="size-3.5" aria-hidden />
        タグや記録時刻はあなただけのもの。ランキングには回数と推定量しか表示されません。
      </p>
    </main>
  );
}
