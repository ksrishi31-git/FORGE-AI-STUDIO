import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Styled native select (FAD §6 — Selects). A native element keeps full
 * keyboard and screen-reader behavior without a custom listbox.
 */
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select
        className={cn(
          "h-9 w-full appearance-none rounded-md border border-input bg-card pl-3 pr-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
}
