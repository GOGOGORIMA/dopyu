"use client";

import { useSyncExternalStore } from "react";

/**
 * Stopwatch state stored in localStorage.
 *
 * Only timestamps (when a run started, total of earlier runs) are stored, never a ticking counter,
 * so measurement keeps going across reloads, closed tabs and background throttling.
 * Tabs stay in sync through the storage event.
 */

export type StopwatchStatus = "idle" | "running" | "paused" | "finished";

export type StopwatchState = {
  status: StopwatchStatus;
  /** When the measurement was first started (startTime, epoch ms) */
  startedAt: number | null;
  /** Start of the current run (epoch ms). Set only while running */
  runningSince: number | null;
  /** Total time of completed runs (ms) = the time shown on screen */
  accumulatedMs: number;
  /** When the current pause began (epoch ms). Set only while paused */
  pausedAt: number | null;
  /** Total time spent paused so far (ms) */
  pausedMs: number;
  /** When "finish" was pressed (endTime, epoch ms). Set only while finished */
  finishedAt: number | null;
};

// v2 adds startedAt / pausedMs for the tamper check (v1 data is simply ignored)
const STORAGE_KEY = "dopyu:stopwatch:v2";

export const IDLE_STATE: StopwatchState = {
  status: "idle",
  startedAt: null,
  runningSince: null,
  accumulatedMs: 0,
  pausedAt: null,
  pausedMs: 0,
  finishedAt: null,
};

const listeners = new Set<() => void>();
let cache: { raw: string | null; state: StopwatchState } | null = null;

function isValidState(value: unknown): value is StopwatchState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const isNum = (x: unknown) => typeof x === "number" && Number.isFinite(x);
  return (
    (v.status === "idle" || v.status === "running" || v.status === "paused" || v.status === "finished") &&
    isNum(v.accumulatedMs) &&
    isNum(v.pausedMs) &&
    (v.startedAt === null || isNum(v.startedAt)) &&
    (v.pausedAt === null || isNum(v.pausedAt)) &&
    (v.status === "idle" || isNum(v.startedAt)) &&
    (v.runningSince === null || isNum(v.runningSince)) &&
    (v.finishedAt === null || isNum(v.finishedAt)) &&
    (v.status !== "running" || isNum(v.runningSince)) &&
    (v.status !== "finished" || isNum(v.finishedAt))
  );
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** useSyncExternalStore requires the same reference for unchanged data, so cache by the raw string. */
function getSnapshot(): StopwatchState {
  const raw = readRaw();
  if (cache && cache.raw === raw) return cache.state;
  let state = IDLE_STATE;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isValidState(parsed)) state = parsed;
    } catch {
      // Treat corrupted data as idle
    }
  }
  cache = { raw, state };
  return state;
}

function getServerSnapshot(): StopwatchState {
  return IDLE_STATE;
}

function emit() {
  for (const listener of listeners) listener();
}

function write(state: StopwatchState) {
  try {
    if (state.status === "idle") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Storage unavailable (e.g. private browsing): keep the state in memory only
    cache = { raw: readRaw(), state };
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStopwatchState(): StopwatchState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Elapsed time (ms) at instant now */
export function getElapsedMs(state: StopwatchState, now: number): number {
  if (state.status === "running" && state.runningSince !== null) {
    return state.accumulatedMs + Math.max(0, now - state.runningSince);
  }
  return state.accumulatedMs;
}

export const stopwatch = {
  start(now = Date.now()) {
    const state = getSnapshot();
    if (state.status === "idle") {
      write({ ...IDLE_STATE, status: "running", startedAt: now, runningSince: now });
    } else if (state.status === "paused") {
      const pausedFor = state.pausedAt !== null ? Math.max(0, now - state.pausedAt) : 0;
      write({ ...state, status: "running", runningSince: now, pausedAt: null, pausedMs: state.pausedMs + pausedFor });
    }
  },
  pause(now = Date.now()) {
    const state = getSnapshot();
    if (state.status !== "running") return;
    write({ ...state, status: "paused", runningSince: null, accumulatedMs: getElapsedMs(state, now), pausedAt: now });
  },
  /** Stops the measurement and enters the "recording" state. */
  finish(now = Date.now()) {
    const state = getSnapshot();
    if (state.status !== "running" && state.status !== "paused") return;
    const pausedFor = state.status === "paused" && state.pausedAt !== null ? Math.max(0, now - state.pausedAt) : 0;
    write({
      ...state,
      status: "finished",
      runningSince: null,
      accumulatedMs: getElapsedMs(state, now),
      pausedAt: null,
      pausedMs: state.pausedMs + pausedFor,
      finishedAt: now,
    });
  },
  /** Closing the record screen without saving returns to paused (the dialog time counts as paused time). */
  cancelFinish(now = Date.now()) {
    const state = getSnapshot();
    if (state.status !== "finished") return;
    write({ ...state, status: "paused", pausedAt: state.finishedAt ?? now, finishedAt: null });
  },
  reset() {
    write(IDLE_STATE);
  },
};

/** Called on logout and similar. */
export function clearStopwatch() {
  stopwatch.reset();
}
