import { Tags } from "lucide-react";

/** Material ranking (top 10 tags you used). Ranked horizontal bars in one hue. */
export function TopTags({ tags }: { tags: { name: string; count: number }[] }) {
  const max = Math.max(1, ...tags.map((t) => t.count));

  return (
    <section aria-labelledby="top-tags-title" className="space-y-3">
      <h2 id="top-tags-title" className="flex items-center gap-1.5 font-semibold">
        <Tags className="size-4 text-violet" aria-hidden />
        オカズランキング
        <span className="text-xs font-normal text-muted">TOP10</span>
      </h2>
      {tags.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">タグ付きの記録がまだありません</p>
      ) : (
        <ol className="space-y-2.5">
          {tags.map((tag, index) => (
            <li key={tag.name} className="grid grid-cols-[1.5rem_1fr] items-center gap-2">
              <span className="text-right text-xs font-semibold text-muted tabular-nums">{index + 1}</span>
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-medium" title={tag.name}>
                    {tag.name}
                  </span>
                  <span className="shrink-0 text-xs text-ink-2 tabular-nums">{tag.count}回</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-r-[4px] bg-surface-2" aria-hidden>
                  <div
                    className="h-full rounded-r-[4px] bg-chart-accent"
                    style={{ width: `${(tag.count / max) * 100}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
