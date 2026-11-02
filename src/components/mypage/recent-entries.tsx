"use client";

import { History, LoaderCircle, Trash2, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { deleteEntry, type LocalEntry } from "@/lib/local-db";
import { EXCLUSION_LABEL } from "@/lib/ranking-rules";
import { formatDurationJa, formatMl } from "@/lib/time";

type MyEntry = LocalEntry;

const dateFormat = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** Recent entries (visible only to you). Entries saved by mistake can be deleted. */
export function RecentEntries({ entries }: { entries: LocalEntry[] }) {
  const data = useMemo(
    () => ({ entries: [...entries].sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 10) }),
    [entries],
  );
  const error: string | null = null;
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(entry: MyEntry) {
    if (!window.confirm(`${dateFormat.format(new Date(entry.completedAt))} の記録を削除しますか？`)) return;
    setDeleting(entry.id);
    setDeleteError(null);
    try {
      deleteEntry(entry.id);
    } catch {
      setDeleteError("削除に失敗しました");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <section aria-labelledby="recent-title" className="space-y-3">
      <h2 id="recent-title" className="flex items-center gap-1.5 font-semibold">
        <History className="size-4 text-accent" aria-hidden />
        最近の記録
      </h2>
      {(error || deleteError) && <p className="text-sm text-red-300">{error ?? deleteError}</p>}
      {!data ? (
        <div className="space-y-2" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      ) : data.entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">まだ記録がありません</p>
      ) : (
        <ul className="divide-y divide-line">
          {data.entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-semibold">{dateFormat.format(new Date(entry.completedAt))}</span>
                  <span className="text-xs text-ink-2">
                    {formatDurationJa(entry.durationSeconds)} · {formatMl(entry.volumeMl)}ml
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {!entry.isRanked && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-200">
                      <TriangleAlert className="size-3" aria-hidden />
                      マイページのみ{entry.rankExclusion ? `（${EXCLUSION_LABEL[entry.rankExclusion]}）` : ""}
                    </span>
                  )}
                  {entry.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-ink-2">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(entry)}
                disabled={deleting !== null}
                className="shrink-0 rounded-full p-2 text-muted transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
                aria-label="この記録を削除"
              >
                {deleting === entry.id ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
