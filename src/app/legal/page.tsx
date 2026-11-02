import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { PrivacyContent, TermsContent } from "@/components/legal-content";

export const metadata: Metadata = { title: "利用規約・免責事項・プライバシーポリシー" };

export default function LegalPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link href="/" aria-label="DOPYU ホーム">
        <Logo />
      </Link>
      <h1 className="mt-6 text-2xl font-bold">利用規約・免責事項</h1>
      <div id="terms" className="mt-4 scroll-mt-6 rounded-3xl border border-line bg-surface p-5">
        <TermsContent />
      </div>
      <h2 id="privacy" className="mt-8 scroll-mt-6 text-2xl font-bold">
        プライバシーポリシー
      </h2>
      <div className="mt-4 rounded-3xl border border-line bg-surface p-5">
        <PrivacyContent />
      </div>
    </main>
  );
}
