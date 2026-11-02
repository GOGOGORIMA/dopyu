import Link from "next/link";
import { AuthGate } from "@/components/auth-gate";
import { Logo } from "@/components/brand/logo";
import { BottomNav, DesktopNav } from "@/components/nav/nav-links";
import { UserMenu } from "@/components/nav/user-menu";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/" aria-label="DOPYU ホーム">
            <Logo />
          </Link>
          <DesktopNav />
          <UserMenu />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 md:pb-12">
        <AuthGate mode="user">{children}</AuthGate>
      </main>
      <BottomNav />
    </>
  );
}
