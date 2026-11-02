import type { Metadata } from "next";
import { RankingBoard } from "@/components/ranking/ranking-board";
import { T } from "@/lib/i18n";

export const metadata: Metadata = { title: "ランキング | Ranking" };

export default function RankingPage() {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold tracking-[0.3em] text-accent">RANKING</p>
        <h1 className="mt-1 text-2xl font-bold">
          <T ja="ランキング" en="Global Ejaculation Championship" />
        </h1>
      </div>
      <RankingBoard />
    </div>
  );
}
