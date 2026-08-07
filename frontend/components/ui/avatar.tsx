import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export interface AvatarProps extends ComponentProps<"span"> {
  name?: string | null;
}

/** Initials avatar — the platform renders no external images by default. */
export function Avatar({ name = null, className, ...props }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-9 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-accent text-xs font-semibold text-accent-foreground",
        className,
      )}
      {...props}
    >
      {initialsOf(name ?? "?")}
    </span>
  );
}
