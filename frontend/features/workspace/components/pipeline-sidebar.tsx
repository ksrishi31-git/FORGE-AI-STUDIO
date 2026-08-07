"use client";

import {
  Check,
  CircleDashed,
  Loader2,
  RefreshCcw,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AgentDefinition, AgentStep, RunStatusResponse, StepStatus } from "@/services/agents";
import { RunStatusBadge, ModeBadge } from "@/features/agents/components/status-badges";
import { stepForAgent } from "../lib/artifacts";
import { formatBytes, stepConfidence, stepMemoryBytes } from "../lib/artifacts";

const STATUS_META: Record<StepStatus, { icon: LucideIcon; className: string }> = {
  pending: { icon: CircleDashed, className: "text-muted-foreground/50" },
  running: { icon: Loader2, className: "animate-spin text-warning" },
  completed: { icon: Check, className: "text-success" },
  failed: { icon: TriangleAlert, className: "text-destructive" },
  skipped: { icon: CircleDashed, className: "text-muted-foreground/50" },
  needs_revision: { icon: RefreshCcw, className: "text-warning" },
};

export interface PipelineSidebarProps {
  definitions: AgentDefinition[] | undefined;
  steps: AgentStep[] | undefined;
  status: RunStatusResponse | undefined;
  loading: boolean;
  activeAgentKey: string;
  onSelectAgent: (agentKey: string) => void;
}

function telemetry(
  step: AgentStep | undefined,
): { time: string | null; confidence: number | null; memory: string | null } {
  if (!step) {
    return { time: null, confidence: null, memory: null };
  }
  const time =
    step.duration_ms !== null && step.duration_ms !== undefined
      ? `${(step.duration_ms / 1000).toFixed(1)}s`
      : null;
  const confidence = stepConfidence(step);
  const memory = stepMemoryBytes(step) > 0 ? formatBytes(stepMemoryBytes(step)) : null;
  return { time, confidence, memory };
}

function AgentCard({
  definition,
  step,
  runActive,
  currentAgent,
  selected,
  onSelect,
}: {
  definition: AgentDefinition;
  step: AgentStep | undefined;
  runActive: boolean;
  currentAgent: string | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const status: StepStatus = step?.status ?? "pending";
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const { time, confidence, memory } = telemetry(step);

  const progress =
    status === "completed" || status === "failed" ? 100 : status === "running" ? null : 0;

  let task = "Waiting in queue";
  if (status === "running") {
    task = "Working…";
  } else if (status === "completed") {
    task = time ? `Completed in ${time}` : "Completed";
  } else if (status === "failed") {
    task = "Failed";
  } else if (status === "needs_revision") {
    task = "Needs revision";
  }

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "group w-full rounded-md border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          selected
            ? "border-primary/40 bg-accent/60"
            : "border-border hover:border-primary/30 hover:bg-accent/40",
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className={cn("size-4 shrink-0", meta.className)} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold">
            {definition.name}
          </span>
          {status === "running" && currentAgent === definition.key ? (
            <Badge variant="warning" className="px-1.5 py-0 text-[10px]">
              Active
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 truncate pl-6 text-[11px] text-muted-foreground">
          {definition.role}
        </p>

        {runActive && status === "running" ? (
          <div className="mt-1.5 pl-6">
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/2 animate-[workspace-indeterminate_1.2s_ease-in-out_infinite] rounded-full bg-warning" />
            </div>
          </div>
        ) : (
          <div className="mt-1.5 pl-6">
            <Progress value={progress ?? 0} className="h-1" />
          </div>
        )}

        <div className="mt-1 flex items-center justify-between gap-2 pl-6 text-[10px] text-muted-foreground">
          <span className="truncate">{task}</span>
          <span className="flex shrink-0 items-center gap-1.5 tabular-nums">
            {confidence !== null ? (
              <span title={`Confidence ${confidence}%`}>{confidence}%</span>
            ) : null}
            {memory !== null ? (
              <span title={`Artifact memory ${memory}`}>{memory}</span>
            ) : null}
          </span>
        </div>
      </button>
    </li>
  );
}

/** Left IDE panel: the ten-agent pipeline with live status and telemetry. */
export function PipelineSidebar({
  definitions,
  steps,
  status,
  loading,
  activeAgentKey,
  onSelectAgent,
}: PipelineSidebarProps) {
  const runActive = status?.status === "queued" || status?.status === "running";

  return (
    <aside className="flex h-full min-w-0 flex-col border-r border-border bg-card">
      <div className="shrink-0 space-y-2 border-b border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Agent Pipeline
          </h2>
          {status ? <RunStatusBadge status={status.status} /> : null}
        </div>
        {status ? (
          <div className="flex items-center gap-2">
            <ModeBadge mode={status.mode} />
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {status.completed_steps}/{status.total_steps} steps
            </span>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">Ten specialist agents</p>
        )}
        {status ? (
          <Progress
            value={status.progress}
            className="h-1.5"
            indicatorClassName="bg-primary"
          />
        ) : null}
      </div>

      <div className="workspace-scroll min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <ul className="space-y-2" aria-hidden="true">
            {Array.from({ length: 10 }).map((_, index) => (
              <li key={index}>
                <Skeleton className="h-16 w-full" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-1.5">
            {(definitions ?? [])
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((definition) => {
                const step = stepForAgent(steps, definition.key);
                return (
                  <AgentCard
                    key={definition.key}
                    definition={definition}
                    step={step}
                    runActive={runActive}
                    currentAgent={status?.current_step ?? null}
                    selected={activeAgentKey === definition.key}
                    onSelect={() => onSelectAgent(definition.key)}
                  />
                );
              })}
          </ul>
        )}
      </div>
    </aside>
  );
}
