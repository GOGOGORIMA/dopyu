import { DEFAULT_TIME_ZONE, getZonedParts } from "./time";

/**
 * Estimated volume per session (ml), by age bracket.
 * These are the app's rough reference values, not medical data.
 */
export const VOLUME_BRACKETS = [
  { label: "29歳以下", maxAge: 29, volumeMl: 3.5 },
  { label: "30代", maxAge: 39, volumeMl: 3.0 },
  { label: "40代", maxAge: 49, volumeMl: 2.5 },
  { label: "50代", maxAge: 59, volumeMl: 2.0 },
  { label: "60歳以上", maxAge: Number.POSITIVE_INFINITY, volumeMl: 1.5 },
] as const;

/**
 * Age at the reference instant `at`.
 * The birth date is stored as 00:00 UTC, so its UTC fields are read.
 * The reference date is read as a calendar date in the given time zone.
 */
export function calculateAge(
  birthDate: Date,
  at: Date = new Date(),
  timeZone: string = DEFAULT_TIME_ZONE,
): number {
  const birthYear = birthDate.getUTCFullYear();
  const birthMonth = birthDate.getUTCMonth() + 1;
  const birthDay = birthDate.getUTCDate();
  const now = getZonedParts(at, timeZone);

  let age = now.year - birthYear;
  const hadBirthdayThisYear =
    now.month > birthMonth || (now.month === birthMonth && now.day >= birthDay);
  if (!hadBirthdayThisYear) age -= 1;
  return Math.max(0, age);
}

/** Estimated volume per session (ml) for an age. */
export function estimateVolumeMlByAge(age: number): number {
  for (const bracket of VOLUME_BRACKETS) {
    if (age <= bracket.maxAge) return bracket.volumeMl;
  }
  return VOLUME_BRACKETS[VOLUME_BRACKETS.length - 1].volumeMl;
}

/** Computes age from the birth date, then returns the estimated volume per session (ml) at instant `at`. */
export function estimateVolumeMl(
  birthDate: Date,
  at: Date = new Date(),
  timeZone: string = DEFAULT_TIME_ZONE,
): number {
  return estimateVolumeMlByAge(calculateAge(birthDate, at, timeZone));
}
