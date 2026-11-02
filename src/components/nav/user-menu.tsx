import { Flag } from "@/components/flag";
import { getCurrentUser } from "@/lib/auth/dal";
import { getCountryName } from "@/lib/countries";
import { LogoutButton } from "./logout-button";

/** Logged-in user's chip in the header (reads the session, so render it inside Suspense). */
export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex min-w-0 items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5">
        <Flag code={user.countryCode} name={getCountryName(user.countryCode)} />
        <span className="max-w-[9rem] truncate text-sm font-medium">{user.username}</span>
      </div>
      <LogoutButton />
    </div>
  );
}

export function UserMenuSkeleton() {
  return <div className="h-9 w-36 animate-pulse rounded-full bg-surface" aria-hidden />;
}
