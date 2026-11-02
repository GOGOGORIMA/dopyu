import { Lock } from "lucide-react";
import type { Metadata } from "next";
import { MyDashboard } from "@/components/mypage/dashboard";
import { ProfileCard } from "@/components/mypage/profile-card";

export const metadata: Metadata = { title: "マイページ" };

export default function MyPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.3em] text-accent">MY PAGE</p>
          <h1 className="mt-1 text-2xl font-bold">マイページ</h1>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink-2">
          <Lock className="size-3.5" aria-hidden />
          あなただけに表示
        </span>
      </div>
      <ProfileCard />
      {/* Everything is computed in the browser from this browser's localStorage */}
      <MyDashboard />
    </div>
  );
}
