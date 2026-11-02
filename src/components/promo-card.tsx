"use client";

import { ExternalLink } from "lucide-react";
import { AFFILIATES, type AffiliateSlot } from "@/config/affiliates";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";

/** Recommendation card for an affiliate slot, always marked "PR". */
export function PromoCard({ slot, className }: { slot: AffiliateSlot; className?: string }) {
  const { lang, t } = useI18n();
  const ad = AFFILIATES[lang][slot];
  return (
    <a
      href={ad.url}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className={cn(
        "group block w-full rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-line-strong hover:bg-surface-2",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-[11px] text-muted">
        <span className="rounded border border-line-strong px-1.5 py-px font-bold tracking-wider text-ink-2">PR</span>
        <span>{t("おすすめ", "Sponsored")} · {ad.eyebrow}</span>
      </div>
      <p className="mt-1.5 text-sm font-semibold leading-snug text-ink">{ad.title}</p>
      <p className="mt-1 text-xs text-ink-2">{ad.description}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent group-hover:underline">
        {ad.cta}
        <ExternalLink className="size-3" aria-hidden />
      </span>
    </a>
  );
}
