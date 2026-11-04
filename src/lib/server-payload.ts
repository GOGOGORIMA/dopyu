import { getPreset } from "./avatar";

/**
 * Whitelist of what may ever leave the device (Supabase mode).
 *
 * The server stores:
 *   profiles      (public)      user ID, username, preset icon ID (avatar_id), country code, created_at
 *   user_private  (owner only)  user ID, birth date (for the age check and volume estimate; set once)
 *   records       (public)      user ID, completion time, measured seconds, estimated volume (ml), isRanked
 * For records, the server trigger overrides completed_at (now()), volume_ml and is_ranked,
 * so the client values below are only a request; the confirmed row is read back.
 *
 * Everything else — okazu tags (Sauce), start time, ranking-exclusion reason — stays in this
 * browser's localStorage only. Icons are preset IDs only (there is no image upload).
 * Rows are always built field by field here (never by spreading a local object), so a new
 * local field can never be sent by accident.
 */
/** Columns the client writes to profiles (created_at is set by the server). */
export const SERVER_PROFILE_COLUMNS = ["id", "username", "country_code", "avatar_id"] as const;
export const SERVER_PRIVATE_PROFILE_COLUMNS = ["id", "birth_date"] as const;
export const SERVER_ENTRY_COLUMNS = ["id", "user_id", "completed_at", "duration_sec", "volume_ml", "is_ranked"] as const;

export type ServerProfileRow = Record<(typeof SERVER_PROFILE_COLUMNS)[number], string | null>;
export type ServerEntryRow = {
  id: string;
  user_id: string;
  completed_at: string;
  duration_sec: number;
  volume_ml: number;
  is_ranked: boolean;
};

/** Only built-in preset icon IDs are sent; any other value becomes null. */
export function toServerAvatar(avatar: string | null | undefined): string | null {
  return getPreset(avatar)?.id ?? null;
}

export function fromServerAvatar(presetId: string | null | undefined): string | null {
  if (!presetId) return null;
  const avatar = `preset:${presetId}`;
  return getPreset(avatar) ? avatar : null;
}

export function toServerProfile(input: {
  id: string;
  username: string;
  countryCode: string;
  avatar: string | null | undefined;
}): ServerProfileRow {
  return {
    id: input.id,
    username: input.username,
    country_code: input.countryCode,
    avatar_id: toServerAvatar(input.avatar),
  };
}

export function toServerEntry(
  userId: string,
  entry: { id: string; completedAt: string; durationSeconds: number; volumeMl: number; isRanked: boolean },
): ServerEntryRow {
  return {
    id: entry.id,
    user_id: userId,
    completed_at: new Date(entry.completedAt).toISOString(),
    // DB CHECK: 1..86400 seconds
    duration_sec: Math.min(86_400, Math.max(1, Math.round(entry.durationSeconds))),
    volume_ml: entry.volumeMl,
    is_ranked: entry.isRanked,
  };
}

/** Owner-only row (RLS: readable and writable by the user only). birthDate is "YYYY-MM-DD". */
export function toServerPrivateProfile(id: string, birthDate: string): { id: string; birth_date: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) throw new Error("生年月日の形式が正しくありません");
  return { id, birth_date: birthDate };
}
