"use client";

import { Avatar } from "@/components/avatar";
import { Flag } from "@/components/flag";
import { useI18n } from "@/lib/i18n";
import { countryName } from "@/lib/i18n-dict";
import { useCurrentUser } from "@/lib/local-db";
import { LogoutButton } from "./logout-button";

/** Logged-in user's chip in the header. */
export function UserMenu() {
  const user = useCurrentUser();
  const { lang } = useI18n();
  if (!user) return <div className="h-9 w-36 animate-pulse rounded-full bg-surface" aria-hidden />;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex min-w-0 items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1">
        <Avatar avatar={user.avatar} name={user.username} className="size-7" />
        <Flag code={user.countryCode} name={countryName(user.countryCode, lang)} />
        <span className="max-w-[9rem] truncate text-sm font-medium">{user.username}</span>
      </div>
      <LogoutButton />
    </div>
  );
}
