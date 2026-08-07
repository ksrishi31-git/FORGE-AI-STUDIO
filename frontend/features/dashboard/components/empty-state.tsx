import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

/** Professional empty state (FAD §8.3). */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}
    >
      <div
        className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground"
        aria-hidden="true"
      >
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
