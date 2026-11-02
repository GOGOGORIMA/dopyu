"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getCountryName } from "./countries";
import { normalizeTagList } from "./tags";
import { createEntrySchema, loginSchema, registerSchema, toFieldErrors } from "./validation";
import { calculateAge, estimateVolumeMl, estimateVolumeMlByAge } from "./volume";
import { EXCLUSION_LABEL, judgeRanking, type RankingExclusionReason } from "./ranking-rules";
import { APP_TIME_ZONE } from "./time";

/**
 * Browser-only data store (GitHub Pages has no server).
 * Users, the session and entries all live in this browser's localStorage.
 * Nothing is sent anywhere; each browser is its own isolated "database".
 */

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
  return readJson<LocalUser[]>(USERS_KEY, []);
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

export async function registerUser(raw: Record<string, unknown>, reservedUsernames: string[] = []): Promise<LocalUser> {
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
  };
  writeJson(USERS_KEY, [...users, user]);
  writeJson(SESSION_KEY, user.id);
  emit();
  return user;
}

export async function loginUser(raw: Record<string, unknown>): Promise<LocalUser> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) throw new FormError("入力内容を確認してください", toFieldErrors(parsed.error));
  const user = listUsers().find((u) => u.email === parsed.data.email);
  const hash = user ? await hashPassword(parsed.data.password, user.salt) : null;
  if (!user || hash !== user.passwordHash) {
    throw new FormError("メールアドレスまたはパスワードが正しくありません");
  }
  writeJson(SESSION_KEY, user.id);
  emit();
  return user;
}

export function logout() {
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
  }));
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
  writeJson(entriesKey(user.id), [...history, entry]);
  emit();
  return { entry, exclusionLabel: decision.reason ? EXCLUSION_LABEL[decision.reason] : null };
}

export function deleteEntry(entryId: string) {
  const user = requireUser();
  writeJson(
    entriesKey(user.id),
    listEntries(user.id).filter((e) => e.id !== entryId),
  );
  emit();
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
