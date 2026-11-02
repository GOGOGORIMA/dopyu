import { UserRound } from "lucide-react";
import { getPreset } from "@/lib/avatar";
import { cn } from "@/lib/cn";

/** Round user icon: uploaded image, preset emoji avatar, or the default icon when not set. */
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

  if (avatar?.startsWith("data:image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimize
      <img src={avatar} alt={`${name}のアイコン`} className={cn(base, "object-cover")} />
    );
  }

  const preset = getPreset(avatar);
  if (preset) {
    return (
      <span
        role="img"
        aria-label={`${name}のアイコン（${preset.label}）`}
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
    <span role="img" aria-label={`${name}のアイコン（未設定）`} className={cn(base, "bg-surface-3 text-muted")}>
      <UserRound className="size-[60%]" aria-hidden />
    </span>
  );
}
