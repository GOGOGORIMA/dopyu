"use client";

import { ExternalLink } from "lucide-react";
import { AFFILIATES, type AffiliateSlot } from "@/config/affiliates";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";

/** Recommendation card for an affiliate slot, always marked as an ad with a "PR" badge in the top-right corner. */
export function PromoCard({ slot, className }: { slot: AffiliateSlot; className?: string }) {
  const { lang, t } = useI18n();
  const ad = AFFILIATES[lang][slot];
  return (
    <a
      href={ad.url}
      target="_blank"
      rel="sponsored noopener noreferrer"
      aria-label={`PR: ${ad.title}`}
      className={cn(
        "group relative block w-full rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-line-strong hover:bg-surface-2",
        className,
      )}
    >
      {/* Ad disclosure (stealth-marketing rules): always visible in the top-right corner */}
      <span className="absolute top-3 right-3 rounded border border-amber-300/60 bg-amber-300/10 px-1.5 py-px text-[11px] font-bold tracking-wider text-amber-200">
        PR
      </span>
      <div className="pr-10 text-[11px] text-muted">
        {t("広告・おすすめ", "Sponsored")} · {ad.eyebrow}
      </div>
      <p className="mt-1.5 pr-10 text-sm font-semibold leading-snug text-ink">{ad.title}</p>
      <p className="mt-1 text-xs text-ink-2">{ad.description}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent group-hover:underline">
        {ad.cta}
        <ExternalLink className="size-3" aria-hidden />
      </span>
    </a>
  );
}
