"use client";

import {
  Check,
  CircleDashed,
  Loader2,
  RefreshCcw,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { AgentDefinition, AgentStep, StepStatus } from "@/services/agents";

const STATUS_META: Record<StepStatus, { icon: LucideIcon; className: string }> = {
  pending: { icon: CircleDashed, className: "text-muted-foreground/50" },
  running: { icon: Loader2, className: "animate-spin text-warning" },
  completed: { icon: Check, className: "text-success" },
  failed: { icon: TriangleAlert, className: "text-destructive" },
  skipped: { icon: CircleDashed, className: "text-muted-foreground/50" },
  needs_revision: { icon: RefreshCcw, className: "text-warning" },
};

export interface ExecutionTimelineProps {
  steps: AgentStep[];
  definitions: AgentDefinition[] | undefined;
  selectedAgent: string;
  onSelect: (agent: string) => void;
}

export function ExecutionTimeline({
  steps,
  definitions,
  selectedAgent,
  onSelect,
}: ExecutionTimelineProps) {
  const nameFor = (key: string) =>
    definitions?.find((definition) => definition.key === key)?.name ?? key;

  return (
    <ol className="space-y-1" aria-label="Execution timeline">
      {steps.map((step) => {
        const meta = STATUS_META[step.status];
        const Icon = meta.icon;
        const selected = step.agent === selectedAgent;
        return (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => onSelect(step.agent)}
              aria-pressed={selected}
              className={cn(
                "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                selected
                  ? "border-primary/40 bg-accent/60"
                  : "border-transparent hover:bg-accent/40",
              )}
            >
              <Icon className={cn("size-4 shrink-0", meta.className)} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {nameFor(step.agent)}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {step.duration_ms !== null && step.duration_ms !== undefined
                  ? `${(step.duration_ms / 1000).toFixed(1)}s`
                  : ""}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
