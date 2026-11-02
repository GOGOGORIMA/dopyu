"use client";

import { CalendarDays, Hourglass, LoaderCircle, Lock, Trophy, TriangleAlert, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createEntry, getCurrentUser, listEntries, listMyTags, useDb } from "@/lib/local-db";
import { EXCLUSION_LABEL, judgeRanking } from "@/lib/ranking-rules";
import { normalizeTagName } from "@/lib/tags";
import { formatDurationJa } from "@/lib/time";
import { TagPicker, type TagSuggestion } from "./tag-picker";

export type SavedEntryResult = ReturnType<typeof createEntry>;

const dateTimeFormat = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** Record screen opened after "finish". Completion time and measured duration are filled in automatically. */
export function RecordDialog({
  startedAt,
  completedAt,
  durationSeconds,
  pausedSeconds,
  onCancel,
  onSaved,
}: {
  /** startTime (epoch ms) */
  startedAt: number;
  /** endTime (epoch ms) */
  completedAt: number;
  durationSeconds: number;
  pausedSeconds: number;
  onCancel: () => void;
  onSaved: (result: SavedEntryResult) => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The native <dialog> traps focus and handles Escape for us
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  // Past tags come from this browser's localStorage (only the user's own)
  const suggestions = useDb<TagSuggestion[]>(() => {
    const user = getCurrentUser();
    return user ? listMyTags(user.id) : [];
  });

  // Preview of how this entry will be judged (the same rules run again when saving)
  const decision = useDb(() => {
    const user = getCurrentUser();
    return judgeRanking(user ? listEntries(user.id) : [], new Date(completedAt), durationSeconds);
  }, `${completedAt}:${durationSeconds}`);

  // At least one tag is required (bot / mis-tap guard); text typed but not yet added also counts
  const pendingTag = normalizeTagName(draft);
  const hasTag = selected.length > 0 || pendingTag !== null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);

    // Also include text that was typed but not added with Enter
    const tags = pendingTag && !selected.includes(pendingTag) ? [...selected, pendingTag] : selected;

    try {
      const result = createEntry({
        startTime: new Date(startedAt).toISOString(),
        completedAt: new Date(completedAt).toISOString(),
        durationSeconds,
        pausedSeconds,
        tags,
      });
      onSaved(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onCancel();
      }}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-full animate-sheet overflow-hidden rounded-t-3xl border border-line-strong bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-lg sm:rounded-3xl"
    >
      <form onSubmit={handleSubmit} className="flex max-h-[92dvh] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 pt-5 pb-4">
          <div>
            <h2 id={titleId} className="text-lg font-bold">
              記録する
            </h2>
            <p className="text-sm text-ink-2">お疲れさまでした。タグを付けて保存しましょう。</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="-m-1 rounded-full p-2 text-muted transition hover:bg-surface-2 hover:text-ink"
            aria-label="閉じる"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-line bg-bg/60 p-3.5">
              <dt className="flex items-center gap-1.5 text-xs text-muted">
                <CalendarDays className="size-3.5" aria-hidden />
                完了日時
              </dt>
              <dd className="mt-1 text-[15px] font-semibold">{dateTimeFormat.format(new Date(completedAt))}</dd>
            </div>
            <div className="rounded-2xl border border-line bg-bg/60 p-3.5">
              <dt className="flex items-center gap-1.5 text-xs text-muted">
                <Hourglass className="size-3.5" aria-hidden />
                かかった時間
              </dt>
              <dd className="mt-1 text-[15px] font-semibold">{formatDurationJa(durationSeconds)}</dd>
            </div>
          </dl>

          {decision &&
            (decision.isRanked ? (
              <div className="flex gap-2.5 rounded-2xl border border-accent/30 bg-accent/10 p-3.5 text-sm text-ink">
                <Trophy className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                <p>この記録は<strong className="font-semibold">ランキング集計の対象</strong>として保存されます。</p>
              </div>
            ) : (
              <div
                role="alert"
                className="flex gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3.5 text-sm text-amber-200"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                <p>
                  {decision.reason && <strong className="font-semibold">{EXCLUSION_LABEL[decision.reason]}のため、</strong>}
                  この記録は<strong className="font-semibold">マイページにのみ</strong>保存されます（ランキング集計の対象外）。
                </p>
              </div>
            ))}

          <TagPicker
            suggestions={suggestions}
            selected={selected}
            onChange={setSelected}
            draft={draft}
            onDraftChange={setDraft}
          />

          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Lock className="size-3.5 shrink-0" aria-hidden />
            タグと完了時刻はあなただけに表示され、ランキングには公開されません。
          </p>

          {error && (
            <p role="alert" className="rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-3 border-t border-line px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="h-12 rounded-xl border border-line px-5 text-sm font-semibold text-ink-2 transition hover:bg-surface-2"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={saving || !hasTag}
            title={hasTag ? undefined : "オカズタグを1つ以上選択または入力してください"}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold text-accent-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            {saving ? "保存中…" : hasTag ? "記録を保存" : "タグを1つ以上選んでください"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
