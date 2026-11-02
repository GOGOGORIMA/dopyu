import { Lock } from "lucide-react";
import type { Metadata } from "next";
import { AccountSettings } from "@/components/mypage/account-settings";
import { MyDashboard } from "@/components/mypage/dashboard";
import { ProfileCard } from "@/components/mypage/profile-card";
import { T } from "@/lib/i18n";

export const metadata: Metadata = { title: "マイページ | My Page" };

export default function MyPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.3em] text-accent">MY PAGE</p>
          <h1 className="mt-1 text-2xl font-bold">
            <T ja="マイページ" en="My Page" />
          </h1>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink-2">
          <Lock className="size-3.5" aria-hidden />
          <T ja="あなただけに表示" en="Only visible to you" />
        </span>
      </div>
      <ProfileCard />
      {/* Everything is computed in the browser from this browser's localStorage */}
      <MyDashboard />
      <AccountSettings />
    </div>
  );
}
