import { UserRound } from "lucide-react";
import { getPreset } from "@/lib/avatar";
import { cn } from "@/lib/cn";

/** Round user icon: a preset emoji avatar, or the default icon (also for any legacy non-preset value). */
export function Avatar({
  avatar,
  name,
  className,
}: {
  avatar?: string | null;
  name: string;
  /** Size via Tailwind, e.g. "size-8" (default) */
  className?: string;
}) {
  const base = cn("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full ring-1 ring-line-strong", className ?? "size-8");

  const preset = getPreset(avatar);
  if (preset) {
    return (
      <span
        role="img"
        aria-label={name}
        className={cn(base, "[container-type:size]")}
        style={{ backgroundImage: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }}
      >
        {/* Emoji scales with the avatar size (container query units) */}
        <span className="text-[58cqmin] leading-none select-none" aria-hidden>
          {preset.emoji}
        </span>
      </span>
    );
  }

  return (
    <span role="img" aria-label={name} className={cn(base, "bg-surface-3 text-muted")}>
      <UserRound className="size-[60%]" aria-hidden />
    </span>
  );
}
