"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface SectionErrorProps {
  onRetry: () => void;
}

/** Compact error state for a dashboard section (FAD §8.4). */
export function SectionError({ onRetry }: SectionErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div
        className="flex size-10 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 text-destructive"
        aria-hidden="true"
      >
        <AlertCircle className="size-4" />
      </div>
      <h3 className="mt-4 text-sm font-semibold tracking-tight">Could not load data</h3>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
        The API could not be reached. Check that the backend is running, then retry.
      </p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        <RefreshCw aria-hidden="true" />
        Retry
      </Button>
    </div>
  );
}
