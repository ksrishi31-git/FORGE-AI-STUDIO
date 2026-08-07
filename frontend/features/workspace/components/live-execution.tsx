"use client";

import { Check, Loader2, PauseCircle, RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ModeBadge, RunStatusBadge } from "@/features/agents/components/status-badges";
import { cn } from "@/lib/utils";
import type {
  AgentDefinition,
  AgentStep,
  RunOutput,
  RunStatusResponse,
} from "@/services/agents";
import { formatTime } from "../lib/events";
import { stepForAgent } from "../lib/artifacts";

export interface LiveExecutionProps {
  status: RunStatusResponse;
  output: RunOutput | undefined;
  definitions: AgentDefinition[] | undefined;
  paused: boolean;
  onResume: () => void;
  onRetry: () => void;
  onSelectAgent: (agentKey: string) => void;
}

/** Live Execution — streaming progress of the active pipeline (Phase 3.6). */
export function LiveExecution({
  status,
  output,
  definitions,
  paused,
  onResume,
  onRetry,
  onSelectAgent,
}: LiveExecutionProps) {
  const steps = output?.steps ?? [];
  const runActive = status.status === "queued" || status.status === "running";
  // Run-level verdict is persisted at completion — always the final one, even
  // when the reflection loop ran the reviewer several times.
  const verdict = status.verdict;
  const failed = status.status === "failed";

  return (
    <section className="shrink-0 border-b border-border bg-card">
      <div className="space-y-2.5 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <RunStatusBadge status={status.status} />
            <ModeBadge mode={status.mode} />
            {verdict ? (
              <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {verdict}
              </span>
            ) : null}
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {formatTime(status.started_at ?? status.created_at)}
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {runActive && status.current_step
                ? `Running: ${status.current_step.replaceAll("_", " ")}`
                : `${status.completed_steps} of ${status.total_steps} steps`}
            </span>
            <span className="tabular-nums">{status.progress}%</span>
          </div>
          <Progress
            value={status.progress}
            className="mt-1 h-1.5"
            indicatorClassName={failed ? "bg-destructive" : undefined}
          />
        </div>

        {(definitions ?? [])
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((definition) => {
            const step = stepForAgent(steps, definition.key);
            return (
              <AgentStreamChip
                key={definition.key}
                label={definition.name}
                step={step}
                running={status.current_step === definition.key}
                onClick={() => onSelectAgent(definition.key)}
              />
            );
          })}

        {paused && runActive ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            <span className="inline-flex items-center gap-2">
              <PauseCircle className="size-4 shrink-0" aria-hidden="true" />
              Live updates paused — the pipeline continues on the server.
            </span>
            <Button variant="outline" size="sm" onClick={onResume}>
              Resume
            </Button>
          </div>
        ) : null}

        {failed ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
            {status.error ? (
              <div className="flex items-start gap-2 text-xs text-destructive">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="break-words">{status.error}</span>
              </div>
            ) : null}
            <div className="mt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RotateCcw aria-hidden="true" />
                Retry from failed agent
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function AgentStreamChip({
  label,
  step,
  running,
  onClick,
}: {
  label: string;
  step: AgentStep | undefined;
  running: boolean;
  onClick: () => void;
}) {
  const state = step?.status ?? "pending";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        state === "completed" &&
          "border-success/30 bg-success/10 text-success hover:bg-success/15",
        state === "running" && "border-warning/40 bg-warning/10 text-warning",
        state === "failed" &&
          "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15",
        (state === "pending" || state === "skipped") &&
          "border-border bg-muted/50 text-muted-foreground hover:text-foreground",
      )}
    >
      {state === "completed" ? <Check className="size-3" aria-hidden="true" /> : null}
      {state === "running" || running ? (
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
      ) : null}
      {label}
    </button>
  );
}
