import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { APP_TIME_ZONE } from "@/lib/config";
import { getCountryName } from "@/lib/countries";
import { prisma } from "@/lib/prisma";
import { calculateAge, estimateVolumeMlByAge } from "@/lib/volume";
import { readSession } from "./session";

/**
 * Data Access Layer: the one place that checks authentication and loads the user.
 * The proxy's redirect is only an optimistic check. Final checks always go through here.
 */

export type CurrentUser = {
  id: string;
  email: string;
  username: string;
  countryCode: string;
  birthDate: Date;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, username: true, countryCode: true, birthDate: true },
  });
});

/** For pages: sends unauthenticated visitors to the login page. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Profile data that is safe to show to the user themself (no internal ID or password hash). */
export type Profile = {
  username: string;
  email: string;
  countryCode: string;
  countryName: string;
  birthDate: string;
  age: number;
  volumePerSessionMl: number;
};

export function toProfile(user: CurrentUser, now: Date = new Date()): Profile {
  const age = calculateAge(user.birthDate, now, APP_TIME_ZONE);
  return {
    username: user.username,
    email: user.email,
    countryCode: user.countryCode,
    countryName: getCountryName(user.countryCode),
    birthDate: user.birthDate.toISOString().slice(0, 10),
    age,
    volumePerSessionMl: estimateVolumeMlByAge(age),
  };
}
