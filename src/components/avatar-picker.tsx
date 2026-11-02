"use client";

import { Check, ImageUp, LoaderCircle, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { AVATAR_PRESETS, presetAvatar, resizeImageToAvatar } from "@/lib/avatar";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { translateMessage } from "@/lib/i18n-dict";

/**
 * Icon picker: upload an image (resized to 128x128 WebP/JPEG 0.7 in the browser)
 * or tap one of the preset avatars. `value` null = not set (default icon).
 */
export function AvatarPicker({
  value,
  onChange,
  name,
}: {
  value: string | null;
  onChange: (avatar: string | null) => void;
  /** Used for the preview's accessible name */
  name: string;
}) {
  const inputId = useId();
  const { lang, t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await resizeImageToAvatar(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "画像の変換に失敗しました");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <Avatar avatar={value} name={name || t("あなた", "You")} className="size-16" />
        <div className="flex flex-wrap gap-2">
          <label
            htmlFor={inputId}
            className={cn(
              "inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-line-strong bg-surface-2 px-3.5 text-sm font-semibold transition hover:bg-surface-3",
              busy && "pointer-events-none opacity-60",
            )}
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <ImageUp className="size-4" aria-hidden />}
            {t("画像をアップロード", "Upload image")}
          </label>
          <input
            ref={fileRef}
            id={inputId}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-sm text-muted transition hover:text-ink"
            >
              <X className="size-4" aria-hidden />
              {t("未設定に戻す", "Remove")}
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted">{t("画像は 128×128px に自動で切り抜き・圧縮して保存します。", "Images are auto-cropped and compressed to 128×128px.")}</p>
      {error && <p className="text-xs text-red-300">{translateMessage(error, lang)}</p>}

      <div>
        <p className="mb-2 text-xs text-ink-2">{t("またはプリセットから選ぶ", "Or pick a preset")}</p>
        <div role="radiogroup" aria-label={t("プリセットアイコン", "Preset icons")} className="grid grid-cols-6 gap-2 sm:grid-cols-12">
          {AVATAR_PRESETS.map((preset) => {
            const id = presetAvatar(preset.id);
            const selected = value === id;
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={preset.label}
                title={preset.label}
                onClick={() => onChange(id)}
                className={cn(
                  "relative grid place-items-center rounded-full p-0.5 transition",
                  selected ? "ring-2 ring-accent" : "hover:ring-2 hover:ring-line-strong",
                )}
              >
                <Avatar avatar={id} name={preset.label} className="size-10" />
                {selected && (
                  <span className="absolute -right-0.5 -bottom-0.5 grid size-4 place-items-center rounded-full bg-accent text-accent-ink">
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
