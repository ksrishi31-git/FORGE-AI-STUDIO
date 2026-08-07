import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export interface ProgressProps extends ComponentProps<"div"> {
  /** Progress 0–100. */
  value: number;
  indicatorClassName?: string;
}

/** Determinate progress bar (FAD §3 — Progress Tracker). */
export function Progress({ value, indicatorClassName, className, ...props }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full bg-primary transition-[width] duration-500",
          indicatorClassName,
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
