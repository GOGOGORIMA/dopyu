import { Globe } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Flag icon (flag-icons SVG). Renders the same flags on Windows,
 * where flag emoji are not supported.
 */
export function Flag({
  code,
  name,
  className,
}: {
  code: string;
  name?: string;
  className?: string;
}) {
  const lower = code.toLowerCase();
  const label = name ?? code;
  if (!/^[a-z]{2}$/.test(lower)) {
    return <Globe className={cn("size-4 text-muted", className)} aria-label={label} />;
  }
  return <span className={cn("fi", `fi-${lower}`, className)} role="img" aria-label={label} title={label} />;
}
