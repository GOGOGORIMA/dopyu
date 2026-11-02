import type { Metadata } from "next";
import { RankingBoard } from "@/components/ranking/ranking-board";

export const metadata: Metadata = { title: "ランキング" };

export default function RankingPage() {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold tracking-[0.3em] text-accent">RANKING</p>
        <h1 className="mt-1 text-2xl font-bold">年間ランキング</h1>
      </div>
      <RankingBoard />
    </div>
  );
}
