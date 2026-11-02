/**
 * User icons (avatars).
 * Stored on the user as either:
 *   - "preset:<id>"              one of the built-in emoji avatars below
 *   - "data:image/webp;base64,…" an uploaded image resized to 128x128 in the browser
 *   - undefined / null           not set -> default icon
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

/** Uploaded images are stored as small data URLs; reject anything unexpected or too large. */
const MAX_DATA_URL_LENGTH = 200_000;

export function isValidAvatar(avatar: unknown): avatar is string {
  if (typeof avatar !== "string") return false;
  if (avatar.startsWith("preset:")) return getPreset(avatar) !== null;
  return /^data:image\/(webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(avatar) && avatar.length <= MAX_DATA_URL_LENGTH;
}

export const AVATAR_SIZE = 128;
export const AVATAR_QUALITY = 0.7;
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像を読み込めませんでした。別の画像を選んでください"));
    };
    img.src = url;
  });
}

/**
 * Resizes an image file in the browser: center-cropped to a square, scaled to 128x128,
 * encoded as WebP quality 0.7 (JPEG 0.7 where WebP encoding is unsupported, e.g. older Safari).
 * Keeps each avatar to a few KB so localStorage (~5 MB) is not strained.
 */
export async function resizeImageToAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("画像ファイルを選んでください");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("画像が大きすぎます（20MBまで）");

  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  if (!side) throw new Error("画像のサイズを取得できませんでした");
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("画像の変換に失敗しました");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // JPEG has no alpha: paint a background so transparent PNGs do not turn black
  ctx.fillStyle = "#1d1d28";
  ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

  const webp = canvas.toDataURL("image/webp", AVATAR_QUALITY);
  const dataUrl = webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", AVATAR_QUALITY);
  if (!isValidAvatar(dataUrl)) throw new Error("画像の変換に失敗しました");
  return dataUrl;
}
