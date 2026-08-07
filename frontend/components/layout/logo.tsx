import { cn } from "@/lib/utils";

/** Brand mark — a four-square grid rendered as pure SVG. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cn("size-5", className)}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.55" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.55" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.28" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <LogoMark />
      </span>
      {!compact ? (
        <span className="text-base font-semibold tracking-tight">ForgeAI Studio</span>
      ) : null}
    </span>
  );
}
