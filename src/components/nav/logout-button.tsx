"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { clearStopwatch } from "@/components/stopwatch/stopwatch-store";
import { logout } from "@/lib/local-db";

export function LogoutButton() {
  const router = useRouter();

  function handleLogout() {
    // Clear the measurement on this device so the next person to log in does not see it
    clearStopwatch();
    logout();
    router.replace("/login");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
      aria-label="ログアウト"
      title="ログアウト"
    >
      <LogOut className="size-4" />
    </button>
  );
}
