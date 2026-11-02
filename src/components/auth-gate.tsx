"use client";

import { LoaderCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/local-db";

/**
 * Client-side route guard (a static site has no server/proxy).
 * - "user": shows children only when logged in, otherwise goes to /login
 * - "guest": sends logged-in users from /login and /register to home
 */
export function AuthGate({ mode, children }: { mode: "user" | "guest"; children: ReactNode }) {
  const user = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const allowed = user !== undefined && (mode === "user" ? user !== null : user === null);

  useEffect(() => {
    if (user === undefined || allowed) return;
    if (mode === "user") {
      router.replace(pathname === "/" ? "/login" : `/login?next=${encodeURIComponent(pathname)}`);
    } else {
      router.replace("/");
    }
  }, [user, allowed, mode, pathname, router]);

  if (!allowed) {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-muted" aria-busy="true">
        <LoaderCircle className="size-6 animate-spin" aria-label={t("読み込み中", "Loading")} />
      </div>
    );
  }
  return <>{children}</>;
}
