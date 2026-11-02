"use client";

import { LoaderCircle, LogOut } from "lucide-react";
import { useState } from "react";
import { clearStopwatch } from "@/components/stopwatch/stopwatch-store";

export function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // Clear the measurement on this device so the next person to log in does not see it
      clearStopwatch();
      // Full navigation also drops any private screen data from the client router cache
      window.location.replace("/login");
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-60"
      aria-label="ログアウト"
      title="ログアウト"
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
    </button>
  );
}
