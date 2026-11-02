"use client";

import { Droplet, Pencil } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { AvatarPicker } from "@/components/avatar-picker";
import { Flag } from "@/components/flag";
import { useI18n } from "@/lib/i18n";
import { countryName, translateMessage } from "@/lib/i18n-dict";
import { getCurrentUser, toProfile, updateAvatar, useDb } from "@/lib/local-db";
import { VOLUME_BRACKETS } from "@/lib/volume";

/** Profile summary of the logged-in user, with an icon editor. */
export function ProfileCard() {
  const user = useDb(() => getCurrentUser());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { lang, t } = useI18n();
  if (!user) return <ProfileCardSkeleton />;
  const profile = toProfile(user);

  function startEditing() {
    setDraft(user?.avatar ?? null);
    setError(null);
    setEditing(true);
  }

  function save() {
    try {
      updateAvatar(draft);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    }
  }

  return (
    <section className="rounded-3xl border border-line bg-surface p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={startEditing}
            className="group relative shrink-0 rounded-full"
            aria-label={t("アイコンを変更", "Change icon")}
          >
            <Avatar avatar={user.avatar} name={profile.username} className="size-16" />
            <span className="absolute -right-0.5 -bottom-0.5 grid size-6 place-items-center rounded-full border border-line-strong bg-surface-2 text-ink-2 transition group-hover:text-ink">
              <Pencil className="size-3" aria-hidden />
            </span>
          </button>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{profile.username}</p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
              <span className="inline-flex items-center gap-1.5">
                <Flag code={profile.countryCode} name={countryName(profile.countryCode, lang)} />
                {countryName(profile.countryCode, lang)}
              </span>
              <span className="text-muted">·</span>
              <span>{t(`${profile.age}歳`, `Age ${profile.age}`)}</span>
            </p>
            {!editing && (
              <button type="button" onClick={startEditing} className="mt-1 text-xs font-medium text-accent hover:underline">
                {t("プロフィールを編集", "Edit profile")}
              </button>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-bg/60 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs text-ink-2">
            <Droplet className="size-3.5 text-accent" aria-hidden />
            {t("1回あたりの推定量", "Est. volume per session")}
          </p>
          <p className="mt-0.5 text-2xl font-bold">
            {profile.volumePerSessionMl.toFixed(1)}
            <span className="ml-0.5 text-sm font-semibold text-ink-2">ml</span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {lang === "en"
              ? "≤29: 3.5 / 30s: 3.0 / 40s: 2.5 / 50s: 2.0 / 60+: 1.5 (ml)"
              : VOLUME_BRACKETS.map((b) => `${b.label} ${b.volumeMl.toFixed(1)}`).join(" / ")}
          </p>
        </div>
      </div>

      {editing && (
        <div className="mt-5 space-y-4 border-t border-line pt-5">
          <h2 className="text-sm font-semibold">{t("アイコンを変更", "Change icon")}</h2>
          <AvatarPicker value={draft} onChange={setDraft} name={profile.username} />
          <p className="text-xs text-muted">{t("アイコンはランキング（国内・世界）にも表示されます。", "Your icon is also shown in the National and Global rankings.")}</p>
          {error && <p className="text-sm text-red-300">{translateMessage(error, lang)}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-11 rounded-xl border border-line px-5 text-sm font-semibold text-ink-2 transition hover:bg-surface-2"
            >
              {t("キャンセル", "Cancel")}
            </button>
            <button
              type="button"
              onClick={save}
              className="h-11 rounded-xl bg-accent px-6 text-sm font-bold text-accent-ink transition hover:brightness-110"
            >
              {t("保存する", "Save")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export function ProfileCardSkeleton() {
  return <div className="h-28 animate-pulse rounded-3xl bg-surface" aria-hidden />;
}
