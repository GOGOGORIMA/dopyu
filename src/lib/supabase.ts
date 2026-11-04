import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  SERVER_ENTRY_COLUMNS,
  SERVER_PRIVATE_PROFILE_COLUMNS,
  SERVER_PROFILE_COLUMNS,
  fromServerAvatar,
  toServerAvatar,
  toServerEntry,
  toServerPrivateProfile,
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
 * start time and exclusion reasons stay in localStorage on the user's device. The birth date is
 * stored in an owner-only table (never public).
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseEnabled = Boolean(url && anonKey);

/** Competition records (see supabase/schema.sql). */
const RECORDS_TABLE = "records";

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
  /** YYYY-MM-DD from the owner-only user_private table (null for accounts created before it was stored) */
  birthDate: string | null;
};

export const CAPTCHA_FAILED_MESSAGE = "ボット対策の確認に失敗しました。もう一度チェックしてから送信してください";

function fail(error: { message: string } | null, fallback: string): never | void {
  if (!error) return;
  // Supabase CAPTCHA protection (Turnstile) rejected or did not receive the token
  if (/captcha/i.test(error.message)) throw new Error(CAPTCHA_FAILED_MESSAGE);
  throw new Error(`${fallback}（${error.message}）`);
}

/** Sign up, then create the public profile (username, country, preset icon ID) and the owner-only birth date row. */
export async function remoteSignUp(input: {
  email: string;
  password: string;
  username: string;
  countryCode: string;
  birthDate: string;
  avatar: string | null;
  /** Cloudflare Turnstile token (verified by Supabase Auth when CAPTCHA protection is on) */
  captchaToken?: string;
}): Promise<RemoteProfile & { birthDate: string }> {
  const sb = getSupabase()!;
  const { data: taken } = await sb.from("profiles").select("id").eq("username", input.username).maybeSingle();
  if (taken) throw new Error("このユーザーネームは既に使われています");
  const { data, error } = await sb.auth.signUp({
    email: input.email,
    password: input.password,
    options: { captchaToken: input.captchaToken },
  });
  fail(error, "登録に失敗しました");
  if (!data.session || !data.user) {
    throw new Error("確認メールを送信しました。メール内のリンクで認証してからログインしてください");
  }
  const id = data.user.id;
  const row = toServerProfile({ id, username: input.username, countryCode: input.countryCode, avatar: input.avatar });
  const profile = await sb.from("profiles").insert(row);
  fail(profile.error, "プロフィールの作成に失敗しました");
  const priv = await sb.from("user_private").insert(toServerPrivateProfile(id, input.birthDate));
  fail(priv.error, "プロフィールの作成に失敗しました");
  return {
    id,
    email: input.email,
    username: row.username!,
    countryCode: row.country_code!,
    avatar: fromServerAvatar(row.avatar_id),
    birthDate: input.birthDate,
  };
}

export type RemoteAccountData = { profile: RemoteProfile; entries: RemoteEntry[] };

/** Reads the user's own profile, owner-only birth date and every record (the source of truth for totals). */
async function fetchOwnData(sb: SupabaseClient, id: string, email: string): Promise<RemoteAccountData> {
  const [prof, priv, recs] = await Promise.all([
    sb.from("profiles").select(SERVER_PROFILE_COLUMNS.join(", ")).eq("id", id).single<ServerProfileRow>(),
    sb
      .from("user_private")
      .select(SERVER_PRIVATE_PROFILE_COLUMNS.join(", "))
      .eq("id", id)
      .maybeSingle<{ id: string; birth_date: string }>(),
    fetchAll<ServerEntryRow>(RECORDS_TABLE, SERVER_ENTRY_COLUMNS.join(", "), false, id),
  ]);
  fail(prof.error, "プロフィールを読み込めませんでした");
  return {
    profile: {
      id,
      email,
      username: prof.data!.username!,
      countryCode: prof.data!.country_code!,
      avatar: fromServerAvatar(prof.data!.avatar_id),
      birthDate: priv.data?.birth_date ?? null,
    },
    entries: recs.map((e) => ({
      id: e.id,
      completedAt: e.completed_at,
      durationSeconds: e.duration_sec,
      volumeMl: e.volume_ml,
      isRanked: e.is_ranked,
    })),
  };
}

/** Sign in and download the user's profile and competition records. */
export async function remoteSignIn(email: string, password: string, captchaToken?: string): Promise<RemoteAccountData> {
  const sb = getSupabase()!;
  const { data, error } = await sb.auth.signInWithPassword({ email, password, options: { captchaToken } });
  if (error && /captcha/i.test(error.message)) throw new Error(CAPTCHA_FAILED_MESSAGE);
  if (error || !data.user) throw new Error("メールアドレスまたはパスワードが正しくありません");
  try {
    return await fetchOwnData(sb, data.user.id, email);
  } catch {
    throw new Error("記録を読み込めませんでした");
  }
}

/**
 * Re-downloads the logged-in user's data (another device may have added or deleted records).
 * Returns null when there is no Supabase session for `userId`.
 */
export async function remoteFetchOwnData(userId: string): Promise<RemoteAccountData | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  const user = data.session?.user;
  if (!user || user.id !== userId) return null;
  return fetchOwnData(sb, user.id, user.email ?? "");
}

/** Stores the owner-only birth date. It can be set once; the server refuses later changes. */
export async function remoteSaveBirthDate(userId: string, birthDate: string) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("user_private").insert(toServerPrivateProfile(userId, birthDate));
  fail(error, "生年月日の保存に失敗しました");
}

/** Values the server decided for a new record (see enforce_record_rules() in schema.sql). */
export type ConfirmedRecord = { completedAt: string; volumeMl: number; isRanked: boolean };

/**
 * Sends a record (tags and other private fields are dropped by toServerEntry).
 * The server overrides completed_at, volume_ml and is_ranked and may reject the insert
 * ("Rate limit exceeded"); resolves to the confirmed values.
 */
export async function remoteInsertEntry(
  userId: string,
  e: { id: string; completedAt: string; durationSeconds: number; volumeMl: number; isRanked: boolean },
): Promise<ConfirmedRecord | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from(RECORDS_TABLE)
    .insert(toServerEntry(userId, e))
    .select("completed_at, volume_ml, is_ranked")
    .single<{ completed_at: string; volume_ml: number; is_ranked: boolean }>();
  fail(error, "記録の同期に失敗しました");
  return data ? { completedAt: data.completed_at, volumeMl: data.volume_ml, isRanked: data.is_ranked } : null;
}

export async function remoteDeleteEntry(entryId: string) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from(RECORDS_TABLE).delete().eq("id", entryId);
  fail(error, "記録の削除に失敗しました");
}

/** Sends the preset icon ID (null = default icon). */
export async function remoteUpdateAvatar(userId: string, avatar: string | null) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("profiles").update({ avatar_id: toServerAvatar(avatar) }).eq("id", userId);
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

/** Reads every row (PostgREST returns at most 1000 rows per request), optionally for one user only. */
async function fetchAll<T>(table: string, columns: string, rankedOnly = false, userId?: string): Promise<T[]> {
  const sb = getSupabase()!;
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    let query = sb.from(table).select(columns);
    if (rankedOnly) query = query.eq("is_ranked", true);
    if (userId) query = query.eq("user_id", userId);
    const { data, error } = await query.order("id").range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return rows;
  }
}

async function refresh() {
  type P = { id: string; username: string; country_code: string; avatar_id: string | null; created_at: string };
  type E = { user_id: string; completed_at: string; volume_ml: number };
  const [profiles, entries] = await Promise.all([
    fetchAll<P>("profiles", "id, username, country_code, avatar_id, created_at"),
    fetchAll<E>(RECORDS_TABLE, "user_id, completed_at, volume_ml", true),
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
      avatar: fromServerAvatar(p.avatar_id),
      countryCode: p.country_code,
      // Sign-up time (or the first ranked record, if that is earlier)
      joinedAt: list.reduce((min, e) => Math.min(min, e.t), Math.min(now, new Date(p.created_at).getTime() || now)),
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
      .on("postgres_changes", { event: "*", schema: "public", table: RECORDS_TABLE }, debounced)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, debounced)
      .subscribe();
  }
  return () => listeners.delete(onChange);
}
