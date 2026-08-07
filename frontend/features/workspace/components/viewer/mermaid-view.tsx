"use client";

import { useEffect, useRef, useState } from "react";

import { renderMermaid } from "@/lib/mermaid";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/providers/theme-provider";

export interface MermaidViewProps {
  source: string | null;
}

/**
 * Mermaid view — renders the diagram generated from the artifact's structured
 * data. Rendering is delegated to the shared `renderMermaid` helper so the
 * Architecture Viewer reuses the exact same engine wiring (Phase 3.7).
 */
export function MermaidView({ source }: MermaidViewProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!source) {
      setState("idle");
      return;
    }
    let cancelled = false;
    setState("loading");
    void (async () => {
      try {
        const svg = await renderMermaid(source, theme === "dark" ? "dark" : "light");
        if (cancelled) {
          return;
        }
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
        setState("ready");
      } catch (reason) {
        if (cancelled) {
          return;
        }
        setState("error");
        setError(reason instanceof Error ? reason.message : "Unable to render the diagram");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, theme]);

  if (!source) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No diagram is available for this artifact.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">
        Diagram generated from the structured artifact data.
      </p>
      {state === "loading" ? <Skeleton className="h-44 w-full" /> : null}
      {state === "error" ? (
        <Alert variant="destructive" className="text-xs">
          {error}
        </Alert>
      ) : null}
      <div
        ref={containerRef}
        className="flex justify-center overflow-x-auto rounded-md border border-border bg-card p-4"
      />
      <details className="rounded-md border border-border bg-muted/30">
        <summary className="cursor-pointer px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
          Mermaid source
        </summary>
        <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed">{source}</pre>
      </details>
    </div>
  );
}
