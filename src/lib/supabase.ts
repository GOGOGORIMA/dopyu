import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  SERVER_ENTRY_COLUMNS,
  SERVER_PROFILE_COLUMNS,
  fromServerAvatar,
  toServerAvatar,
  toServerEntry,
  toServerProfile,
  type ServerEntryRow,
  type ServerProfileRow,
} from "./server-payload";

/**
 * Optional Supabase backend (hybrid mode).
 * When NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set at build time,
 * accounts and competition records are shared through Supabase (schema: supabase/schema.sql).
 * Otherwise the app keeps working with localStorage only.
 *
 * Privacy: only the columns in src/lib/server-payload.ts are ever sent. Okazu tags (Sauce),
 * birth date, start time and uploaded icon images stay in localStorage on the user's device.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseEnabled = Boolean(url && anonKey);

let client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseEnabled || typeof window === "undefined") return null;
  client ??= createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}

/** Competition data only (see src/lib/server-payload.ts). Tags, start time etc. are never on the server. */
export type RemoteEntry = {
  id: string;
  completedAt: string;
  durationSeconds: number;
  volumeMl: number;
  isRanked: boolean;
};

export type RemoteProfile = {
  id: string;
  /** From Supabase Auth (login only); not stored in any table */
  email: string;
  username: string;
  countryCode: string;
  /** "preset:<id>" or null */
  avatar: string | null;
};

function fail(error: { message: string } | null, fallback: string): never | void {
  if (error) throw new Error(`${fallback}（${error.message}）`);
}

/** Sign up, then create the public profile (username, country, preset icon ID only). */
export async function remoteSignUp(input: {
  email: string;
  password: string;
  username: string;
  countryCode: string;
  avatar: string | null;
}): Promise<RemoteProfile> {
  const sb = getSupabase()!;
  const { data: taken } = await sb.from("profiles").select("id").eq("username", input.username).maybeSingle();
  if (taken) throw new Error("このユーザーネームは既に使われています");
  const { data, error } = await sb.auth.signUp({ email: input.email, password: input.password });
  fail(error, "登録に失敗しました");
  if (!data.session || !data.user) {
    throw new Error("確認メールを送信しました。メール内のリンクで認証してからログインしてください");
  }
  const id = data.user.id;
  const row = toServerProfile({ id, username: input.username, countryCode: input.countryCode, avatar: input.avatar });
  const profile = await sb.from("profiles").insert(row);
  fail(profile.error, "プロフィールの作成に失敗しました");
  return { id, email: input.email, username: row.username!, countryCode: row.country_code!, avatar: fromServerAvatar(row.avatar_preset) };
}

/** Sign in and download the user's profile and competition records. */
export async function remoteSignIn(email: string, password: string): Promise<{ profile: RemoteProfile; entries: RemoteEntry[] }> {
  const sb = getSupabase()!;
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error("メールアドレスまたはパスワードが正しくありません");
  const id = data.user.id;
  const [prof, ents] = await Promise.all([
    sb.from("profiles").select(SERVER_PROFILE_COLUMNS.join(", ")).eq("id", id).single<ServerProfileRow>(),
    sb.from("entries").select(SERVER_ENTRY_COLUMNS.join(", ")).eq("user_id", id).returns<ServerEntryRow[]>(),
  ]);
  fail(prof.error, "プロフィールを読み込めませんでした");
  fail(ents.error, "記録を読み込めませんでした");
  return {
    profile: {
      id,
      email,
      username: prof.data!.username!,
      countryCode: prof.data!.country_code!,
      avatar: fromServerAvatar(prof.data!.avatar_preset),
    },
    entries: (ents.data ?? []).map((e) => ({
      id: e.id,
      completedAt: e.completed_at,
      durationSeconds: e.duration_seconds,
      volumeMl: e.volume_ml,
      isRanked: e.is_ranked,
    })),
  };
}

/** Sends the competition fields of a record. Tags and other private fields are dropped by toServerEntry. */
export async function remoteInsertEntry(
  userId: string,
  e: { id: string; completedAt: string; durationSeconds: number; volumeMl: number; isRanked: boolean },
) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("entries").insert(toServerEntry(userId, e));
  fail(error, "記録の同期に失敗しました");
}

export async function remoteDeleteEntry(entryId: string) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("entries").delete().eq("id", entryId);
  fail(error, "記録の削除に失敗しました");
}

/** Shares the icon only when it is a built-in preset; an uploaded image is kept on this device (sent as null). */
export async function remoteUpdateAvatar(userId: string, avatar: string | null) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("profiles").update({ avatar_preset: toServerAvatar(avatar) }).eq("id", userId);
  fail(error, "アイコンの保存に失敗しました");
}

export async function remoteSignOut() {
  await getSupabase()?.auth.signOut();
}

/** Deletes the auth user; every profile / record row cascades (see delete_my_account in schema.sql). */
export async function remoteDeleteAccount() {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.rpc("delete_my_account");
  fail(error, "サーバー上のデータ削除に失敗しました");
  await sb.auth.signOut();
}

// ---------------------------------------------------------------------------
// Shared ranking data (public columns only), kept fresh with Realtime
// ---------------------------------------------------------------------------
export type RemoteParticipant = {
  id: string;
  username: string;
  avatar: string | null;
  countryCode: string;
  joinedAt: number;
  events: { t: number; v: number }[];
};

let participants: RemoteParticipant[] | null = null;
const listeners = new Set<() => void>();
let started = false;

export function getRemoteParticipants(): RemoteParticipant[] | null {
  return participants;
}

/** Reads every row (PostgREST returns at most 1000 rows per request). */
async function fetchAll<T>(table: string, columns: string, rankedOnly = false): Promise<T[]> {
  const sb = getSupabase()!;
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const base = sb.from(table).select(columns);
    const { data, error } = await (rankedOnly ? base.eq("is_ranked", true) : base).range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return rows;
  }
}

async function refresh() {
  type P = { id: string; username: string; country_code: string; avatar_preset: string | null };
  type E = { user_id: string; completed_at: string; volume_ml: number };
  const [profiles, entries] = await Promise.all([
    fetchAll<P>("profiles", "id, username, country_code, avatar_preset"),
    fetchAll<E>("entries", "user_id, completed_at, volume_ml", true),
  ]);
  const events = new Map<string, { t: number; v: number }[]>();
  for (const e of entries) {
    const list = events.get(e.user_id) ?? [];
    list.push({ t: new Date(e.completed_at).getTime(), v: e.volume_ml });
    events.set(e.user_id, list);
  }
  const now = Date.now();
  participants = profiles.map((p) => {
    const list = events.get(p.id) ?? [];
    return {
      id: p.id,
      username: p.username,
      avatar: fromServerAvatar(p.avatar_preset),
      countryCode: p.country_code,
      // No sign-up date is stored on the server: the first ranked record counts as the join date
      joinedAt: list.reduce((min, e) => Math.min(min, e.t), now),
      events: list,
    };
  });
  for (const l of listeners) l();
}

/** Starts loading shared ranking data and listening for changes (no-op without Supabase). */
export function startRemoteRankingSync(onChange: () => void): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};
  listeners.add(onChange);
  if (!started) {
    started = true;
    refresh().catch((e) => console.error("[dopyu] ranking sync failed", e));
    let timer: ReturnType<typeof setTimeout> | undefined;
    const debounced = () => {
      clearTimeout(timer);
      timer = setTimeout(() => refresh().catch(() => {}), 1000);
    };
    sb.channel("dopyu-ranking")
      .on("postgres_changes", { event: "*", schema: "public", table: "entries" }, debounced)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, debounced)
      .subscribe();
  }
  return () => listeners.delete(onChange);
}
