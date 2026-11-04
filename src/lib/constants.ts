/** Constants shared across the app (no heavy dependencies like zod). */

export const MIN_AGE = 18;
export const MIN_PASSWORD_LENGTH = 8;

// ---- Ranking eligibility (isRanked) -------------------------------------------
/** Entries longer than this (120 min) are treated as a forgotten stopwatch: My Page only. */
export const RANKING_MAX_DURATION_SECONDS = 2 * 60 * 60;
/** An entry finished within this time (30 min) after the previous one is in cooldown: My Page only. */
export const RANKING_COOLDOWN_SECONDS = 30 * 60;
/** At most this many ranked entries per calendar day (0:00-23:59). */
export const RANKING_DAILY_LIMIT = 5;

// ---- Tamper detection --------------------------------------------------------
/** Allowed gap (s) between measured time + paused time and the real elapsed time. */
export const TAMPER_TOLERANCE_SECONDS = 3;

/** Longest measurement accepted at all (24 h; same as the DB CHECK on records.duration_sec). */
export const MAX_DURATION_SECONDS = 24 * 60 * 60;
/** Shortest measurement accepted (1 s; same as the DB CHECK on records.duration_sec). */
export const MIN_DURATION_SECONDS = 1;
/** How far back a completion time may be (allows saving after reopening the record screen). */
export const MAX_COMPLETED_AT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
