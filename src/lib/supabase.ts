import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Optional Supabase backend (hybrid mode).
 * When NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set at build time,
 * accounts, records, icons and rankings are shared through Supabase (schema: supabase/schema.sql).
 * Otherwise the app keeps working with localStorage only.
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

export type RemoteEntry = {
  id: string;
  startTime: string;
  completedAt: string;
  durationSeconds: number;
  volumeMl: number;
  isRanked: boolean;
  rankExclusion: string | null;
  tags: string[];
};

export type RemoteProfile = {
  id: string;
  email: string;
  username: string;
  countryCode: string;
  avatar: string | null;
  birthDate: string;
  createdAt: string;
};

function fail(error: { message: string } | null, fallback: string): never | void {
  if (error) throw new Error(`${fallback}（${error.message}）`);
}

/** Sign up, then create the public profile and the private birth date row. */
export async function remoteSignUp(input: {
  email: string;
  password: string;
  username: string;
  countryCode: string;
  birthDate: string;
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
  const profile = await sb.from("profiles").insert({
    id,
    username: input.username,
    country_code: input.countryCode,
    avatar: input.avatar,
  });
  fail(profile.error, "プロフィールの作成に失敗しました");
  const priv = await sb.from("private_profiles").insert({ id, birth_date: input.birthDate });
  fail(priv.error, "プロフィールの作成に失敗しました");
  return { id, email: input.email, username: input.username, countryCode: input.countryCode, avatar: input.avatar, birthDate: input.birthDate, createdAt: new Date().toISOString() };
}

/** Sign in and download the user's own profile and records (including private details). */
export async function remoteSignIn(email: string, password: string): Promise<{ profile: RemoteProfile; entries: RemoteEntry[] }> {
  const sb = getSupabase()!;
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error("メールアドレスまたはパスワードが正しくありません");
  const id = data.user.id;
  const [prof, priv, ents, details] = await Promise.all([
    sb.from("profiles").select("*").eq("id", id).single(),
    sb.from("private_profiles").select("birth_date").eq("id", id).single(),
    sb.from("entries").select("*").eq("user_id", id),
    sb.from("entry_details").select("*").eq("user_id", id),
  ]);
  fail(prof.error, "プロフィールを読み込めませんでした");
  const detailById = new Map((details.data ?? []).map((d) => [d.entry_id as string, d]));
  return {
    profile: {
      id,
      email,
      username: prof.data.username,
      countryCode: prof.data.country_code,
      avatar: prof.data.avatar,
      birthDate: priv.data?.birth_date ?? "1990-01-01",
      createdAt: prof.data.created_at,
    },
    entries: (ents.data ?? []).map((e) => {
      const d = detailById.get(e.id);
      return {
        id: e.id,
        startTime: d?.start_time ?? e.completed_at,
        completedAt: e.completed_at,
        durationSeconds: d?.duration_seconds ?? 0,
        volumeMl: e.volume_ml,
        isRanked: e.is_ranked,
        rankExclusion: e.rank_exclusion,
        tags: d?.tags ?? [],
      };
    }),
  };
}

export async function remoteInsertEntry(userId: string, e: RemoteEntry) {
  const sb = getSupabase();
  if (!sb) return;
  const pub = await sb.from("entries").insert({
    id: e.id,
    user_id: userId,
    completed_at: e.completedAt,
    volume_ml: e.volumeMl,
    is_ranked: e.isRanked,
    rank_exclusion: e.rankExclusion,
  });
  fail(pub.error, "記録の同期に失敗しました");
  const priv = await sb.from("entry_details").insert({
    entry_id: e.id,
    user_id: userId,
    start_time: e.startTime,
    duration_seconds: e.durationSeconds,
    tags: e.tags,
  });
  fail(priv.error, "記録の同期に失敗しました");
}

export async function remoteDeleteEntry(entryId: string) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("entries").delete().eq("id", entryId);
  fail(error, "記録の削除に失敗しました");
}

export async function remoteUpdateAvatar(userId: string, avatar: string | null) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("profiles").update({ avatar }).eq("id", userId);
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
  type P = { id: string; username: string; country_code: string; avatar: string | null; created_at: string };
  type E = { user_id: string; completed_at: string; volume_ml: number };
  const [profiles, entries] = await Promise.all([
    fetchAll<P>("profiles", "id, username, country_code, avatar, created_at"),
    fetchAll<E>("entries", "user_id, completed_at, volume_ml", true),
  ]);
  const events = new Map<string, { t: number; v: number }[]>();
  for (const e of entries) {
    const list = events.get(e.user_id) ?? [];
    list.push({ t: new Date(e.completed_at).getTime(), v: e.volume_ml });
    events.set(e.user_id, list);
  }
  participants = profiles.map((p) => ({
    id: p.id,
    username: p.username,
    avatar: p.avatar,
    countryCode: p.country_code,
    joinedAt: new Date(p.created_at).getTime(),
    events: events.get(p.id) ?? [],
  }));
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
