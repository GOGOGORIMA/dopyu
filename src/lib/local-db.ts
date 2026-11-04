"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { isValidAvatar, sanitizeAvatar } from "./avatar";
import { getCountryName } from "./countries";
import {
  type ConfirmedRecord,
  type RemoteEntry,
  isSupabaseEnabled,
  remoteDeleteAccount,
  remoteDeleteEntry,
  remoteFetchOwnData,
  remoteInsertEntry,
  remoteSaveBirthDate,
  remoteSignIn,
  remoteSignOut,
  remoteSignUp,
  remoteUpdateAvatar,
  startRemoteRankingSync,
} from "./supabase";
import { normalizeTagList } from "./tags";
import { birthDateSchema, createEntrySchema, loginSchema, registerSchema, toFieldErrors } from "./validation";
import { calculateAge, estimateVolumeMl, estimateVolumeMlByAge } from "./volume";
import { EXCLUSION_LABEL, judgeRanking, type RankingExclusionReason } from "./ranking-rules";
import { APP_TIME_ZONE } from "./time";

/**
 * Browser-only data store (GitHub Pages has no server).
 * Users, the session and entries all live in this browser's localStorage.
 * Without Supabase nothing is sent anywhere; each browser is its own isolated "database".
 *
 * With Supabase (hybrid mode) the competition data and the (owner-only) birth date are synced
 * (see src/lib/server-payload.ts). Okazu tags, start times and exclusion reasons stay here only.
 */

/** Shown when a Supabase account has no birth date on the server yet (accounts from older versions). */
export const BIRTH_DATE_REQUIRED_MESSAGE = "生年月日が登録されていないため、入力してください";

const USERS_KEY = "dopyu:v1:users";
const SESSION_KEY = "dopyu:v1:session";
const entriesKey = (userId: string) => `dopyu:v1:entries:${userId}`;
const KEY_PREFIX = "dopyu:v1:";

export type LocalUser = {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  salt: string;
  /** YYYY-MM-DD */
  birthDate: string;
  countryCode: string;
  createdAt: string;
  /** "preset:<id>" or null (default icon). Presets only, see src/lib/avatar.ts */
  avatar?: string | null;
  /** true = account lives in Supabase (this record is a local cache of it) */
  remote?: boolean;
};

export type LocalEntry = {
  id: string;
  /** When the stopwatch was started (startTime) */
  startTime: string;
  /** When "finish" was pressed (endTime) */
  completedAt: string;
  /** Measured seconds (paused time excluded) */
  durationSeconds: number;
  volumeMl: number;
  /** Counted in the yearly / country rankings. Always shown on My Page either way */
  isRanked: boolean;
  /** Why it is not ranked (null when ranked) */
  rankExclusion: RankingExclusionReason | null;
  tags: string[];
  /** Supabase mode: saved here but not yet confirmed by the server (retried on the next sync) */
  pendingSync?: boolean;
};

export type Profile = {
  username: string;
  email: string;
  countryCode: string;
  countryName: string;
  birthDate: string;
  age: number;
  volumePerSessionMl: number;
};

export class FormError extends Error {
  constructor(
    message: string,
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Storage primitives + change notification
// ---------------------------------------------------------------------------
let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version += 1;
  for (const listener of listeners) listener();
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new FormError("ブラウザの保存領域に書き込めませんでした（プライベートモードや容量不足の可能性があります）");
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(KEY_PREFIX)) {
      version += 1;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Store version: -1 on the server and during hydration (localStorage is browser-only). */
export function useDbVersion(): number {
  return useSyncExternalStore(subscribe, () => version, () => -1);
}

/**
 * Re-runs `read` whenever the store changes (or `key` changes). Returns null until hydrated.
 * Pass every value `read` depends on through `key`.
 */
export function useDb<T>(read: () => T, key = ""): T | null {
  const v = useDbVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (v < 0 ? null : read()), [v, key]);
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

// ---------------------------------------------------------------------------
// Users & session
// ---------------------------------------------------------------------------
export function listUsers(): LocalUser[] {
  // Legacy uploaded images (data URLs) are no longer allowed: they read as "not set"
  return readJson<LocalUser[]>(USERS_KEY, []).map((u) => ({ ...u, avatar: sanitizeAvatar(u.avatar) }));
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getCurrentUser(): LocalUser | null {
  const id = readJson<string | null>(SESSION_KEY, null);
  if (!id) return null;
  return listUsers().find((u) => u.id === id) ?? null;
}

export function toProfile(user: LocalUser, now: Date = new Date()): Profile {
  const birth = new Date(`${user.birthDate}T00:00:00.000Z`);
  const age = calculateAge(birth, now, APP_TIME_ZONE);
  return {
    username: user.username,
    email: user.email,
    countryCode: user.countryCode,
    countryName: getCountryName(user.countryCode),
    birthDate: user.birthDate,
    age,
    volumePerSessionMl: estimateVolumeMlByAge(age),
  };
}

export async function registerUser(
  raw: Record<string, unknown>,
  reservedUsernames: string[] = [],
  avatar: string | null = null,
): Promise<LocalUser> {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) throw new FormError("入力内容を確認してください", toFieldErrors(parsed.error));
  const input = parsed.data;
  const users = listUsers();
  const fieldErrors: Record<string, string> = {};
  if (users.some((u) => u.email === input.email)) fieldErrors.email = "このメールアドレスは既に登録されています";
  if (users.some((u) => u.username === input.username) || reservedUsernames.includes(input.username)) {
    fieldErrors.username = "このユーザーネームは既に使われています";
  }
  if (Object.keys(fieldErrors).length > 0) throw new FormError("既に使われている項目があります", fieldErrors);

  if (isSupabaseEnabled) {
    let remote;
    try {
      remote = await remoteSignUp({
        email: input.email,
        password: input.password,
        username: input.username,
        countryCode: input.countryCode,
        birthDate: input.birthDate.toISOString().slice(0, 10),
        avatar: sanitizeAvatar(avatar),
      });
    } catch (err) {
      throw new FormError(err instanceof Error ? err.message : "登録に失敗しました");
    }
    const user: LocalUser = {
      ...remote,
      createdAt: new Date().toISOString(),
      passwordHash: "",
      salt: "",
      remote: true,
    };
    writeJson(USERS_KEY, [...users.filter((u) => u.id !== user.id), user]);
    writeJson(SESSION_KEY, user.id);
    emit();
    return user;
  }

  const salt = newId();
  const user: LocalUser = {
    id: newId(),
    email: input.email,
    username: input.username,
    passwordHash: await hashPassword(input.password, salt),
    salt,
    birthDate: input.birthDate.toISOString().slice(0, 10),
    countryCode: input.countryCode,
    createdAt: new Date().toISOString(),
    avatar: sanitizeAvatar(avatar),
  };
  writeJson(USERS_KEY, [...users, user]);
  writeJson(SESSION_KEY, user.id);
  emit();
  return user;
}

export async function loginUser(raw: Record<string, unknown>): Promise<LocalUser> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) throw new FormError("入力内容を確認してください", toFieldErrors(parsed.error));
  if (isSupabaseEnabled) {
    // Only needed for accounts whose birth date is not on the server yet: validate it up front
    let birthDate: string | undefined;
    if (typeof raw.birthDate === "string" && raw.birthDate !== "") {
      const birth = birthDateSchema.safeParse(raw.birthDate);
      if (!birth.success) throw new FormError("入力内容を確認してください", { birthDate: birth.error.issues[0].message });
      birthDate = birth.data.toISOString().slice(0, 10);
    }
    let remote;
    try {
      remote = await remoteSignIn(parsed.data.email, parsed.data.password);
    } catch (err) {
      throw new FormError(err instanceof Error ? err.message : "ログインに失敗しました");
    }
    const previous = listUsers().find((u) => u.id === remote.profile.id);
    const serverBirthDate = remote.profile.birthDate;
    birthDate = serverBirthDate ?? birthDate ?? previous?.birthDate;
    if (!birthDate) {
      await remoteSignOut().catch(reportSyncError);
      throw new FormError(BIRTH_DATE_REQUIRED_MESSAGE, { birthDate: BIRTH_DATE_REQUIRED_MESSAGE });
    }
    if (!serverBirthDate) {
      // Older accounts kept it on the device only: store it on the server now
      try {
        await remoteSaveBirthDate(remote.profile.id, birthDate);
      } catch (err) {
        reportSyncError(err);
      }
    }
    const cached: LocalUser = {
      ...remote.profile,
      birthDate,
      createdAt: previous?.createdAt ?? new Date().toISOString(),
      passwordHash: "",
      salt: "",
      remote: true,
    };
    writeJson(USERS_KEY, [...listUsers().filter((u) => u.id !== cached.id), cached]);
    // Server records carry the competition data; device-only fields (tags etc.) are kept from this browser
    writeJson(entriesKey(cached.id), mergeServerRecords(cached.id, remote.entries));
    writeJson(SESSION_KEY, cached.id);
    emit();
    return cached;
  }
  const user = listUsers().find((u) => u.email === parsed.data.email);
  const hash = user ? await hashPassword(parsed.data.password, user.salt) : null;
  if (!user || hash !== user.passwordHash) {
    throw new FormError("メールアドレスまたはパスワードが正しくありません");
  }
  writeJson(SESSION_KEY, user.id);
  emit();
  return user;
}

/** Sets or clears (null) the logged-in user's icon. */
export function updateAvatar(avatar: string | null) {
  const current = getCurrentUser();
  if (!current) throw new FormError("ログインが必要です");
  if (avatar !== null && !isValidAvatar(avatar)) throw new FormError("プリセットのアイコンを選んでください");
  writeJson(
    USERS_KEY,
    listUsers().map((u) => (u.id === current.id ? { ...u, avatar } : u)),
  );
  emit();
  if (current.remote) remoteUpdateAvatar(current.id, avatar).catch(reportSyncError);
}

function reportSyncError(err: unknown) {
  console.error("[dopyu] Supabase sync failed", err);
}

export function logout() {
  if (isSupabaseEnabled) remoteSignOut().catch(reportSyncError);
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
  emit();
}

// ---------------------------------------------------------------------------
// Entries & tags (always scoped to the logged-in user)
// ---------------------------------------------------------------------------
type StoredEntry = Partial<LocalEntry> & { isRankable?: boolean };

/** Reads entries, upgrading ones saved by older versions (isRankable -> isRanked). */
export function listEntries(userId: string): LocalEntry[] {
  return readJson<StoredEntry[]>(entriesKey(userId), []).map((e) => ({
    id: String(e.id),
    startTime: e.startTime ?? String(e.completedAt),
    completedAt: String(e.completedAt),
    durationSeconds: Number(e.durationSeconds) || 0,
    volumeMl: Number(e.volumeMl) || 0,
    isRanked: e.isRanked ?? e.isRankable ?? true,
    rankExclusion: e.rankExclusion ?? null,
    tags: Array.isArray(e.tags) ? e.tags : [],
    ...(e.pendingSync ? { pendingSync: true } : {}),
  }));
}

/**
 * Server records are the source of truth for the competition fields (time, seconds, volume_ml,
 * isRanked); device-only fields (tags, start time, exclusion reason) are kept from this browser.
 * Local records the server has not confirmed yet (pendingSync) are kept so they can be retried.
 */
function mergeServerRecords(userId: string, server: RemoteEntry[]): LocalEntry[] {
  const local = listEntries(userId);
  const byId = new Map(local.map((e) => [e.id, e]));
  const serverIds = new Set(server.map((e) => e.id));
  const merged = server.map((e): LocalEntry => {
    const mine = byId.get(e.id);
    return {
      id: e.id,
      completedAt: e.completedAt,
      durationSeconds: e.durationSeconds,
      volumeMl: e.volumeMl,
      isRanked: e.isRanked,
      startTime: mine?.startTime ?? new Date(new Date(e.completedAt).getTime() - e.durationSeconds * 1000).toISOString(),
      rankExclusion: e.isRanked ? null : (mine?.rankExclusion ?? null),
      tags: mine?.tags ?? [],
    };
  });
  const pending = local.filter((e) => e.pendingSync && !serverIds.has(e.id));
  return [...merged, ...pending].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

/**
 * Adopts what the server decided for a record (completed_at = server time, volume_ml from the stored
 * birth date, is_ranked from the server-side rules) and clears its pending flag.
 */
function confirmSynced(userId: string, entryId: string, confirmed: ConfirmedRecord | null) {
  const entries = listEntries(userId);
  if (!entries.some((e) => e.id === entryId)) return;
  writeJson(
    entriesKey(userId),
    entries.map((e): LocalEntry => {
      if (e.id !== entryId) return e;
      const { pendingSync: _pending, ...rest } = e;
      void _pending;
      if (!confirmed) return rest;
      return {
        ...rest,
        completedAt: confirmed.completedAt,
        volumeMl: confirmed.volumeMl,
        isRanked: confirmed.isRanked,
        // Keep the local reason only when both sides agree the record is not ranked
        rankExclusion: confirmed.isRanked ? null : rest.isRanked ? null : rest.rankExclusion,
      };
    }),
  );
  emit();
}

async function pushEntry(userId: string, entry: LocalEntry) {
  const confirmed = await remoteInsertEntry(userId, entry);
  confirmSynced(userId, entry.id, confirmed);
}

let syncing: Promise<void> | null = null;

/**
 * Supabase mode: pulls the logged-in user's profile, birth date and records from the server
 * (so totals match on every device) and retries records that were not uploaded yet.
 */
export function syncAccountFromServer(): Promise<void> {
  const user = getCurrentUser();
  if (!user?.remote || !isSupabaseEnabled) return Promise.resolve();
  syncing ??= (async () => {
    try {
      for (const entry of listEntries(user.id).filter((e) => e.pendingSync)) {
        await pushEntry(user.id, entry).catch(reportSyncError);
      }
      const data = await remoteFetchOwnData(user.id);
      if (!data) return;
      writeJson(
        USERS_KEY,
        listUsers().map((u) =>
          u.id === user.id
            ? {
                ...u,
                username: data.profile.username,
                countryCode: data.profile.countryCode,
                avatar: data.profile.avatar,
                birthDate: data.profile.birthDate ?? u.birthDate,
              }
            : u,
        ),
      );
      writeJson(entriesKey(user.id), mergeServerRecords(user.id, data.entries));
      emit();
    } catch (err) {
      reportSyncError(err);
    } finally {
      syncing = null;
    }
  })();
  return syncing;
}

/** Keeps the logged-in Supabase account in sync: on mount and whenever the tab becomes visible again. */
export function useAccountSync() {
  useEffect(() => {
    if (!isSupabaseEnabled) return;
    void syncAccountFromServer();
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncAccountFromServer();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
}

function requireUser(): LocalUser {
  const user = getCurrentUser();
  if (!user) throw new FormError("ログインが必要です");
  return user;
}

export type SaveResult = {
  entry: LocalEntry;
  /** Short reason label when the entry is My Page only (e.g. "クールダウン中"), otherwise null */
  exclusionLabel: string | null;
};

/**
 * Saves an entry. Every valid entry is saved (it always appears on My Page);
 * isRanked decides whether it also counts toward the rankings.
 * Throws FormError for invalid or tampered data (start/finish timestamps vs. measured time).
 */
export function createEntry(raw: {
  startTime: string;
  completedAt: string;
  durationSeconds: number;
  pausedSeconds: number;
  tags: string[];
}): SaveResult {
  const user = requireUser();
  const parsed = createEntrySchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error);
    throw new FormError(Object.values(fieldErrors)[0] ?? "入力内容を確認してください", fieldErrors);
  }
  const input = parsed.data;
  const history = listEntries(user.id);
  const decision = judgeRanking(history, input.completedAt, input.durationSeconds);
  const birth = new Date(`${user.birthDate}T00:00:00.000Z`);
  const entry: LocalEntry = {
    id: newId(),
    startTime: input.startTime.toISOString(),
    completedAt: input.completedAt.toISOString(),
    durationSeconds: input.durationSeconds,
    // Snapshot of the estimated volume at the user's age when recorded
    volumeMl: estimateVolumeMl(birth, input.completedAt, APP_TIME_ZONE),
    isRanked: decision.isRanked,
    rankExclusion: decision.reason,
    tags: input.tags,
  };
  writeJson(entriesKey(user.id), [...history, user.remote ? { ...entry, pendingSync: true } : entry]);
  emit();
  // The server confirms completed_at, volume_ml and is_ranked (schema.sql trigger) and those values are kept
  if (user.remote) pushEntry(user.id, entry).catch(reportSyncError);
  return { entry, exclusionLabel: decision.reason ? EXCLUSION_LABEL[decision.reason] : null };
}

export function deleteEntry(entryId: string) {
  const user = requireUser();
  writeJson(
    entriesKey(user.id),
    listEntries(user.id).filter((e) => e.id !== entryId),
  );
  emit();
  if (user.remote) remoteDeleteEntry(entryId).catch(reportSyncError);
}

/**
 * Deletes the logged-in account and every piece of its data:
 * this browser's records, icon, session and stopwatch state, and (with Supabase) the server account
 * with all its rows. Other accounts stored in this browser are left untouched.
 */
export async function deleteAccount(): Promise<void> {
  const user = requireUser();
  if (user.remote) await remoteDeleteAccount();
  try {
    window.localStorage.removeItem(entriesKey(user.id));
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem("dopyu:stopwatch:v2");
  } catch {
    // ignore
  }
  writeJson(
    USERS_KEY,
    listUsers().filter((u) => u.id !== user.id),
  );
  emit();
}

/** Keeps the shared (Supabase) ranking data loaded and re-renders when it changes. */
export function useRemoteRankingSync() {
  useEffect(() => startRemoteRankingSync(emit), []);
}

/** The user's own past tags, most used first. */
export function listMyTags(userId: string): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const entry of listEntries(userId)) {
    for (const tag of normalizeTagList(entry.tags)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ja"));
}

// ---------------------------------------------------------------------------
// Demo account
// ---------------------------------------------------------------------------
export const DEMO_EMAIL = "demo@dopyu.app";
export const DEMO_PASSWORD = "password123";

/** Creates (once) a demo account with a year of sample entries, then logs in. */
export async function loginAsDemo(generateEntries: (birthDate: Date) => LocalEntry[]): Promise<void> {
  const existing = listUsers().find((u) => u.email === DEMO_EMAIL);
  if (existing) {
    await loginUser({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    return;
  }
  const user = await registerUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    username: "dopyu_taro",
    birthDate: "1994-06-15",
    countryCode: "JP",
  });
  writeJson(entriesKey(user.id), generateEntries(new Date(`${user.birthDate}T00:00:00.000Z`)));
  emit();
}

/** Logged-in user: undefined while hydrating, null when logged out. */
export function useCurrentUser(): LocalUser | null | undefined {
  const v = useDbVersion();
  return useMemo(() => (v < 0 ? undefined : getCurrentUser()), [v]);
}
