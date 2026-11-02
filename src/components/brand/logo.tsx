import { Droplet } from "lucide-react";
import { cn } from "@/lib/cn";

export function Logo({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  return (
    <span className={cn("inline-flex items-center gap-2 select-none", className)}>
      <span
        className={cn(
          "grid place-items-center rounded-xl bg-linear-to-br from-accent via-violet to-pink text-bg shadow-[0_0_24px_-4px_rgb(34_211_238/0.6)]",
          size === "lg" ? "size-11" : "size-8",
        )}
      >
        <Droplet className={size === "lg" ? "size-6" : "size-4.5"} strokeWidth={2.5} fill="currentColor" />
      </span>
      <span
        className={cn(
          "bg-linear-to-r from-accent via-violet to-pink bg-clip-text font-black tracking-tight text-transparent",
          size === "lg" ? "text-3xl" : "text-xl",
        )}
      >
        DOPYU
      </span>
    </span>
  );
}
