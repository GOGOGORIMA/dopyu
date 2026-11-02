import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const inputClass =
  "h-12 w-full rounded-xl border border-line bg-bg px-3.5 text-[15px] text-ink outline-none transition placeholder:text-muted focus:border-accent/60 focus:ring-2 focus:ring-accent/20 aria-invalid:border-red-400/60 aria-invalid:ring-red-400/20";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  icon,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-sm font-medium text-ink-2">
        {icon}
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-red-300">
          {error}
        </p>
      ) : hint ? (
        <p className={cn("text-xs text-muted")}>{hint}</p>
      ) : null}
    </div>
  );
}
