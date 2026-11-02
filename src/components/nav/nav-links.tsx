"use client";

import { ChartColumnBig, Timer, Trophy, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const NAV_ITEMS: { href: "/" | "/ranking" | "/mypage"; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "記録", icon: Timer },
  { href: "/ranking", label: "ランキング", icon: Trophy },
  { href: "/mypage", label: "マイページ", icon: ChartColumnBig },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

/** Header navigation for wide screens. */
export function DesktopNav() {
  const isActive = useIsActive();
  return (
    <nav aria-label="メイン" className="hidden items-center gap-1 md:flex">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
            isActive(href)
              ? "bg-surface-3 text-ink"
              : "text-ink-2 hover:bg-surface-2 hover:text-ink",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Bottom tab bar for phones. */
export function BottomNav() {
  const isActive = useIsActive();
  return (
    <nav
      aria-label="メイン"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-accent" : "text-muted hover:text-ink-2",
                )}
              >
                <Icon className="size-5.5" aria-hidden strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
