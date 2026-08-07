"use client";

import { Braces } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AgentStep } from "@/services/agents";
import { fullJson, structuredJson } from "../../lib/artifacts";

export interface JsonViewProps {
  step: AgentStep;
  includeMarkdown: boolean;
  onToggleMarkdown: () => void;
}

/** JSON view — structured fields by default, raw artifact on demand. */
export function JsonView({ step, includeMarkdown, onToggleMarkdown }: JsonViewProps) {
  const json = includeMarkdown ? fullJson(step) : structuredJson(step);
  if (!json) {
    return (
      <p className="text-sm text-muted-foreground">No structured output for this step.</p>
    );
  }
  const rendered = JSON.stringify(json, null, 2);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <Braces className="size-3.5" aria-hidden="true" />
          {includeMarkdown ? "Raw artifact" : "Structured fields"}
        </p>
        <button
          type="button"
          onClick={onToggleMarkdown}
          aria-pressed={includeMarkdown}
          className={cn(
            "rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            includeMarkdown
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          Include markdown field
        </button>
      </div>
      <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
        {rendered}
      </pre>
    </div>
  );
}
