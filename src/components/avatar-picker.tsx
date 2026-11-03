"use client";

import { Check, X } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { AVATAR_PRESETS, presetAvatar } from "@/lib/avatar";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";

/**
 * Icon picker: preset avatars only (image upload is intentionally not supported).
 * `value` null = not set (default icon).
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
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <Avatar avatar={value} name={name || t("あなた", "You")} className="size-16" />
        <div className="space-y-1.5">
          <p className="text-xs text-muted">
            {t(
              "アイコンはプリセットから選べます（画像のアップロードはできません）。",
              "Pick an icon from the presets (image uploads are not supported).",
            )}
          </p>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-sm text-muted transition hover:text-ink"
            >
              <X className="size-4" aria-hidden />
              {t("未設定に戻す", "Remove")}
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs text-ink-2">{t("プリセットから選ぶ", "Presets")}</p>
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
