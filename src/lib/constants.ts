/** Constants shared by server and client (no heavy dependencies like zod). */

export const MIN_AGE = 18;
export const MIN_PASSWORD_LENGTH = 8;
/** Durations under this many seconds are excluded from rankings (anti-cheat). */
export const MIN_RANKABLE_SECONDS = 10;
/** Longest duration accepted for one entry (24 hours). */
export const MAX_DURATION_SECONDS = 24 * 60 * 60;
/** How far back a completion time may be (allows saving after reopening the record screen). */
export const MAX_COMPLETED_AT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
