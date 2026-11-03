"use client";

import { Check, Plus, ShieldCheck, Tag, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { TAG_PRIVACY_NOTE } from "@/lib/i18n-dict";
import { MAX_TAG_LENGTH, MAX_TAGS_PER_ENTRY, normalizeTagName } from "@/lib/tags";

export type TagSuggestion = { name: string; count: number };

/**
 * Material tag input.
 * - Type a new tag and press Enter or "追加"
 * - Tap a chip to reuse a past tag (multiple selection)
 */
export function TagPicker({
  suggestions,
  selected,
  onChange,
  draft,
  onDraftChange,
}: {
  suggestions: TagSuggestion[] | null;
  selected: string[];
  onChange: (tags: string[]) => void;
  draft: string;
  onDraftChange: (value: string) => void;
}) {
  const inputId = useId();
  const { lang, t } = useI18n();
  const [showAll, setShowAll] = useState(false);
  const full = selected.length >= MAX_TAGS_PER_ENTRY;

  const query = normalizeTagName(draft)?.toLowerCase() ?? "";
  const filtered = useMemo(() => {
    if (!suggestions) return [];
    return suggestions.filter(
      (tag) => !selected.includes(tag.name) && (!query || tag.name.toLowerCase().includes(query)),
    );
  }, [suggestions, selected, query]);
  const visible = showAll || query ? filtered : filtered.slice(0, 16);

  function add(raw: string) {
    const name = normalizeTagName(raw);
    if (!name || full) return;
    if (!selected.includes(name)) onChange([...selected, name]);
    onDraftChange("");
  }

  function remove(name: string) {
    onChange(selected.filter((tag) => tag !== name));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label htmlFor={inputId} className="flex items-center gap-1.5 text-sm font-semibold">
          <Tag className="size-4 text-violet" aria-hidden />
          {t("オカズタグ", "Sauce / Tags")}
          <span className="rounded-full bg-pink/15 px-1.5 py-0.5 text-[10px] font-bold text-pink">{t("必須", "Required")}</span>
        </label>
        <span className="text-xs text-muted tabular-nums">
          {selected.length}/{MAX_TAGS_PER_ENTRY}
        </span>
      </div>

      <div className="flex gap-2">
        <input
          id={inputId}
          type="text"
          value={draft}
          maxLength={MAX_TAG_LENGTH}
          disabled={full}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            // Ignore the Enter that confirms an IME conversion (important for Japanese input)
            if (e.key !== "Enter" || e.nativeEvent.isComposing || e.keyCode === 229) return;
            e.preventDefault();
            add(draft);
          }}
          placeholder={full ? t("タグは最大10個までです", "Max 10 tags") : t("新しいタグを入力（例: 動画）", "Add today's sauce (e.g. video)")}
          autoComplete="off"
          enterKeyHint="done"
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-bg px-3.5 text-[15px] outline-none transition placeholder:text-muted focus:border-accent/60 focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => add(draft)}
          disabled={!normalizeTagName(draft) || full}
          className="inline-flex h-11 shrink-0 items-center gap-1 rounded-xl bg-surface-3 px-3.5 text-sm font-semibold transition hover:bg-line-strong disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden />
          {t("追加", "Add")}
        </button>
      </div>

      <p className="flex gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-2 text-[11px] leading-relaxed text-emerald-200/90 ring-1 ring-emerald-500/20">
        <ShieldCheck className="mt-px size-3.5 shrink-0 text-emerald-300" aria-hidden />
        <span>
          {TAG_PRIVACY_NOTE[lang]}
          <br />
          <span className="opacity-75">{TAG_PRIVACY_NOTE[lang === "ja" ? "en" : "ja"]}</span>
        </span>
      </p>

      {selected.length > 0 && (
        <ul aria-label={t("選択中のタグ", "Selected tags")} className="flex flex-wrap gap-2">
          {selected.map((name) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => remove(name)}
                className="inline-flex animate-pop items-center gap-1.5 rounded-full bg-violet/20 py-1.5 pr-2 pl-3 text-sm font-medium text-ink ring-1 ring-violet/50 transition hover:bg-violet/30"
                aria-label={t(`${name} を外す`, `Remove ${name}`)}
              >
                <Check className="size-3.5 text-violet" aria-hidden />
                {name}
                <X className="size-3.5 text-ink-2" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div>
        <p className="mb-2 text-xs text-muted">
          {suggestions === null
            ? t("過去のタグを読み込み中…", "Loading your tags…")
            : suggestions.length === 0
              ? t("過去のタグはまだありません。最初のタグを追加してみましょう。", "No tags yet. Add your first sauce!")
              : query
                ? t(`「${draft.trim()}」に一致する過去のタグ`, `Your tags matching "${draft.trim()}"`)
                : t("過去のタグ（タップで選択・複数OK）", "Your sauce (tap to pick, multiple OK)")}
        </p>
        {suggestions === null ? (
          <div className="flex flex-wrap gap-2" aria-hidden>
            {[56, 72, 48, 88, 64].map((w) => (
              <span key={w} className="h-8 animate-pulse rounded-full bg-surface-2" style={{ width: w }} />
            ))}
          </div>
        ) : (
          <ul className="flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1">
            {visible.map((tag) => (
              <li key={tag.name}>
                <button
                  type="button"
                  disabled={full}
                  onClick={() => add(tag.name)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-sm text-ink-2 transition",
                    "hover:border-line-strong hover:text-ink disabled:opacity-40",
                  )}
                >
                  {tag.name}
                  {tag.count > 0 && <span className="text-[11px] text-muted tabular-nums">{tag.count}</span>}
                </button>
              </li>
            ))}
            {query && filtered.length === 0 && normalizeTagName(draft) && (
              <li className="text-xs text-muted">{t(`Enter で「${normalizeTagName(draft)}」を新規タグとして追加`, `Press Enter to add "${normalizeTagName(draft)}"`)}</li>
            )}
          </ul>
        )}
        {!showAll && !query && filtered.length > visible.length && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-2 text-xs font-medium text-accent hover:underline"
          >
            {t(`すべて表示（${filtered.length}件）`, `Show all (${filtered.length})`)}
          </button>
        )}
      </div>
    </div>
  );
}
