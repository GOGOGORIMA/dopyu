/** "Xで戦績をシェア" button that opens the X post intent in a new tab. */
export function XShareButton({ href, className = "", compact = false }: { href: string; className?: string; compact?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Xで戦績をシェア"
      className={`inline-flex items-center justify-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-bg transition hover:brightness-90 ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      {compact ? (
        <>
          {/* Icon only on phones (the accessible name stays on the link) */}
          <span className="hidden sm:inline">Xで戦績をシェア</span>
        </>
      ) : (
        "Xで戦績をシェア"
      )}
    </a>
  );
}
