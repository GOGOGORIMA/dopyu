/**
 * User icons (avatars): preset-only.
 * Stored on the user as either:
 *   - "preset:<id>"     one of the built-in emoji avatars below
 *   - undefined / null  not set -> default icon
 */

export type AvatarPreset = { id: string; emoji: string; label: string; from: string; to: string };

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "droplet", emoji: "💧", label: "しずく", from: "#22d3ee", to: "#6366f1" },
  { id: "cat", emoji: "🐱", label: "ねこ", from: "#f9a8d4", to: "#a78bfa" },
  { id: "dog", emoji: "🐶", label: "いぬ", from: "#fcd34d", to: "#f97316" },
  { id: "fox", emoji: "🦊", label: "きつね", from: "#fb923c", to: "#e11d48" },
  { id: "panda", emoji: "🐼", label: "パンダ", from: "#e2e8f0", to: "#64748b" },
  { id: "frog", emoji: "🐸", label: "かえる", from: "#86efac", to: "#059669" },
  { id: "penguin", emoji: "🐧", label: "ペンギン", from: "#93c5fd", to: "#1e3a8a" },
  { id: "octopus", emoji: "🐙", label: "タコ", from: "#f472b6", to: "#7c3aed" },
  { id: "unicorn", emoji: "🦄", label: "ユニコーン", from: "#c4b5fd", to: "#f0abfc" },
  { id: "alien", emoji: "👽", label: "宇宙人", from: "#bef264", to: "#0d9488" },
  { id: "fire", emoji: "🔥", label: "ほのお", from: "#fde047", to: "#dc2626" },
  { id: "ghost", emoji: "👻", label: "おばけ", from: "#cbd5e1", to: "#475569" },
];

const PRESET_BY_ID = new Map(AVATAR_PRESETS.map((p) => [p.id, p]));

export const presetAvatar = (id: string) => `preset:${id}`;

export function getPreset(avatar: string | null | undefined): AvatarPreset | null {
  if (!avatar?.startsWith("preset:")) return null;
  return PRESET_BY_ID.get(avatar.slice("preset:".length)) ?? null;
}

/**
 * Only built-in presets are allowed. Image uploads were removed on purpose: no third-party photos
 * (impersonation / defamation) and no illegal or obscene images can ever be stored or shown.
 */
export function isValidAvatar(avatar: unknown): avatar is string {
  return typeof avatar === "string" && getPreset(avatar) !== null;
}

/** Normalizes a stored value: anything that is not a known preset (e.g. a legacy uploaded image) becomes null. */
export function sanitizeAvatar(avatar: unknown): string | null {
  return isValidAvatar(avatar) ? avatar : null;
}
