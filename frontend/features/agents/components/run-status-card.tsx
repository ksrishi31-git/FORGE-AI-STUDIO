"use client";

import { CalendarDays, Loader2, RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { AgentStep, RunStatusResponse } from "@/services/agents";
import { formatDate } from "@/features/projects/lib/format";
import { useRetryRun } from "../hooks/use-agents";
import { ModeBadge, RunStatusBadge } from "./status-badges";

export interface RunStatusCardProps {
  run: RunStatusResponse;
  steps: AgentStep[] | undefined;
}

const VERDICT_CLASS: Record<string, string> = {
  APPROVED: "border-success/40 bg-success/10 text-success",
  NEEDS_REVISION: "border-warning/40 bg-warning/10 text-warning",
  REJECTED: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function RunStatusCard({ run, steps }: RunStatusCardProps) {
  const retry = useRetryRun();
  // Prefer the run-level verdict (persisted at completion — always the final
  // one, even when the reflection loop ran the reviewer several times).
  const verdict = run.verdict;
  const needsRevision = steps?.some((step) => step.status === "needs_revision");

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <RunStatusBadge status={run.status} />
            <ModeBadge mode={run.mode} />
            {verdict ? (
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  VERDICT_CLASS[verdict] ?? "border-border bg-muted text-muted-foreground"
                }`}
              >
                {verdict}
                {typeof run.overall_score === "number" ? ` · ${run.overall_score}/100` : ""}
              </span>
            ) : null}
            {(run.iteration ?? 1) > 1 ? (
              <span
                className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                title={`Execution iteration ${run.iteration}`}
              >
                Iteration {run.iteration}
              </span>
            ) : null}
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {formatDate(run.created_at)}
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {run.status === "running" && run.current_step
                ? `Running: ${run.current_step.replaceAll("_", " ")}`
                : `${run.completed_steps} of ${run.total_steps} steps`}
            </span>
            <span className="tabular-nums">{run.progress}%</span>
          </div>
          <Progress value={run.progress} className="mt-1.5 h-2" />
        </div>

        {needsRevision ? (
          <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="break-words">
              The reviewer requested revisions — feedback was routed to the responsible agent.
            </span>
          </div>
        ) : null}

        {run.status === "failed" && run.error ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="break-words">{run.error}</span>
          </div>
        ) : null}

        {run.status === "failed" ? (
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => void retry.mutateAsync(run.id)}
              disabled={retry.isPending}
            >
              {retry.isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <RotateCcw aria-hidden="true" />
              )}
              Retry from failed agent
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
