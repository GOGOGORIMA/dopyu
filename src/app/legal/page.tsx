import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { PrivacyContent, TermsContent } from "@/components/legal-content";
import { T } from "@/lib/i18n";

export const metadata: Metadata = { title: "利用規約・プライバシーポリシー | Terms & Privacy" };

export default function LegalPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link href="/" aria-label="DOPYU Home">
        <Logo />
      </Link>
      <h1 className="mt-6 text-2xl font-bold">
        <T ja="利用規約・免責事項" en="Terms of Service & Disclaimer" />
      </h1>
      <div id="terms" className="mt-4 scroll-mt-6 rounded-3xl border border-line bg-surface p-5">
        <TermsContent />
      </div>
      <h2 id="privacy" className="mt-8 scroll-mt-6 text-2xl font-bold">
        <T ja="プライバシーポリシー" en="Privacy Policy" />
      </h2>
      <div className="mt-4 rounded-3xl border border-line bg-surface p-5">
        <PrivacyContent />
      </div>
    </main>
  );
}
