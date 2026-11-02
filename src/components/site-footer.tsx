import Link from "next/link";
import { T } from "@/lib/i18n";

/** Footer shown on every page (extra bottom space on phones for the bottom navigation). */
export function SiteFooter() {
  return (
    <footer className="border-t border-line px-4 pt-5 pb-28 text-center text-xs text-muted md:pb-6">
      <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        <Link href="/legal#terms" className="hover:text-ink-2 hover:underline">
          <T ja="利用規約・免責事項" en="Terms & Disclaimer" />
        </Link>
        <Link href="/legal#privacy" className="hover:text-ink-2 hover:underline">
          <T ja="プライバシーポリシー" en="Privacy Policy" />
        </Link>
      </nav>
      <p className="mt-2">
        © DOPYU · <T ja="18歳未満の方はご利用いただけません · 本サイトはプロモーションを含みます" en="18+ only · This site contains promotions" />
      </p>
    </footer>
  );
}
