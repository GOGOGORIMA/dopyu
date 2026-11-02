import { Crown, Medal } from "lucide-react";
import { cn } from "@/lib/cn";

const MEDAL_STYLES: Record<number, string> = {
  1: "bg-gold/15 text-gold ring-gold/40",
  2: "bg-silver/15 text-silver ring-silver/40",
  3: "bg-bronze/15 text-bronze ring-bronze/40",
};

export function RankBadge({ rank, className }: { rank: number; className?: string }) {
  const medal = MEDAL_STYLES[rank];
  if (medal) {
    const Icon = rank === 1 ? Crown : Medal;
    return (
      <span
        className={cn(
          "inline-flex h-7 min-w-7 items-center justify-center gap-0.5 rounded-full px-1.5 text-xs font-bold ring-1 tabular-nums sm:h-8 sm:min-w-8 sm:text-sm",
          medal,
          className,
        )}
        aria-label={`#${rank}`}
      >
        <Icon className="size-3.5" aria-hidden />
        {rank}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-surface-2 px-2 text-xs font-semibold text-ink-2 tabular-nums sm:h-8 sm:min-w-8 sm:text-sm",
        className,
      )}
      aria-label={`#${rank}`}
    >
      {rank}
    </span>
  );
}
