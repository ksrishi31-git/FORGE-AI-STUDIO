"use client";

import { Boxes } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAgentDefinitions,
  useAgentHistory,
  useAgentRunOutput,
  useAgentRunStatus,
} from "../hooks/use-agents";
import { ExecutionTimeline } from "./execution-timeline";
import { HistoryList } from "./history-list";
import { OutputViewer } from "./output-viewer";
import { RunForm } from "./run-form";
import { RunStatusCard } from "./run-status-card";
import { WorkflowGraph } from "./workflow-graph";

export function AgentsPage({ initialRunId }: { initialRunId: string | null }) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(initialRunId);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const definitions = useAgentDefinitions();
  const history = useAgentHistory(1);

  // Default to the most recent run when none is selected and history exists.
  useEffect(() => {
    if (!selectedRunId && history.data && history.data.total > 0) {
      setSelectedRunId(history.data.items[0].id);
    }
  }, [history.data, selectedRunId]);

  const status = useAgentRunStatus(selectedRunId ?? undefined, true);
  const running = status.data?.status === "running" || status.data?.status === "queued";
  const output = useAgentRunOutput(selectedRunId ?? undefined, running);

  // Default the viewed artifact to the final step (review verdict) per run.
  useEffect(() => {
    if (selectedAgent) {
      return;
    }
    const steps = output.data?.steps ?? [];
    if (steps.length > 0) {
      setSelectedAgent(steps[steps.length - 1].agent);
    }
  }, [output.data, selectedAgent]);

  const handleSelectRun = (runId: string) => {
    setSelectedRunId(runId);
    setSelectedAgent(null);
    window.history.replaceState(null, "", `/agents?run=${runId}`);
  };

  const handleSelectAgent = (agent: string) => setSelectedAgent(agent);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Agents" }]}
        title="Agents"
        description="Run the autonomous engineering pipeline — ten specialist agents design, build, test, and review your product."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="size-4 text-muted-foreground" aria-hidden="true" />
              Pipeline workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            {definitions.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <WorkflowGraph
                steps={output.data?.steps}
                definitions={definitions.data}
                activeStep={selectedAgent ?? undefined}
                onSelectStep={handleSelectAgent}
              />
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-sm bg-success/20 ring-1 ring-success"
                  aria-hidden="true"
                />
                Completed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-sm bg-warning/20 ring-1 ring-warning"
                  aria-hidden="true"
                />
                Running
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-sm bg-card ring-1 ring-border"
                  aria-hidden="true"
                />
                Pending
              </span>
              <span className="ml-auto hidden items-center gap-1.5 sm:inline-flex">
                <span
                  className="h-px w-6 border-t border-dashed border-destructive/70"
                  aria-hidden="true"
                />
                Reviewer reflection loop
              </span>
            </div>
          </CardContent>
        </Card>

        <RunForm />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <HistoryList selectedRunId={selectedRunId} onSelect={handleSelectRun} />

        <div className="space-y-4 lg:col-span-2">
          {status.data ? (
            <>
              <RunStatusCard run={status.data} steps={output.data?.steps} />
              {output.data ? (
                <div className="grid gap-4 xl:grid-cols-5">
                  <Card className="xl:col-span-2">
                    <CardHeader>
                      <CardTitle>Execution timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ExecutionTimeline
                        steps={output.data.steps}
                        definitions={definitions.data}
                        selectedAgent={selectedAgent ?? ""}
                        onSelect={handleSelectAgent}
                      />
                    </CardContent>
                  </Card>
                  <div className="xl:col-span-3">
                    <OutputViewer
                      output={output.data}
                      definitions={definitions.data}
                      selectedAgent={selectedAgent ?? ""}
                    />
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    Loading run output…
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
                <Boxes className="size-5 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-medium">No run selected</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Start the pipeline or choose a run from history to inspect its artifacts, logs,
                  and review verdict.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
