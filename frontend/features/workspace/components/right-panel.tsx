"use client";

import {
  Check,
  CircleDashed,
  Loader2,
  RefreshCcw,
  RotateCcw,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ModeBadge,
  RunStatusBadge,
  StepStatusBadge,
} from "@/features/agents/components/status-badges";
import { cn } from "@/lib/utils";
import type { AgentDefinition, RunOutput, StepStatus } from "@/services/agents";
import { artifactTabByKey, structuredJson } from "../lib/artifacts";
import { formatTime } from "../lib/events";
import type { RightTab } from "../hooks/use-workspace-state";

export interface RightPanelProps {
  output: RunOutput | undefined;
  definitions: AgentDefinition[] | undefined;
  selectedTab: string;
  /** Agent pinned in the inspector (null follows the active artifact tab). */
  selectedAgent: string | null;
  rightTab: RightTab;
  outputLoading: boolean;
  onRightTabChange: (tab: RightTab) => void;
  onSelectAgent: (agentKey: string) => void;
  onClearAgent: () => void;
}

const STATUS_ICON: Record<StepStatus, { icon: LucideIcon; className: string }> = {
  pending: { icon: CircleDashed, className: "text-muted-foreground/50" },
  running: { icon: Loader2, className: "animate-spin text-warning" },
  completed: { icon: Check, className: "text-success" },
  failed: { icon: TriangleAlert, className: "text-destructive" },
  skipped: { icon: CircleDashed, className: "text-muted-foreground/50" },
  needs_revision: { icon: RefreshCcw, className: "text-warning" },
};

// --- Structured JSON tree (read-only) -----------------------------------------

function JsonLeaf({ label, value }: { label: ReactNode; value: unknown }) {
  let text: string;
  if (value === null) {
    text = "null";
  } else if (typeof value === "string") {
    text = value;
  } else if (typeof value === "boolean" || typeof value === "number") {
    text = String(value);
  } else {
    text = JSON.stringify(value);
  }
  const truncated = text.length > 120 ? `${text.slice(0, 117)}…` : text;
  return (
    <div className="flex gap-2 py-0.5 text-[11px] leading-relaxed">
      {label !== null && label !== undefined ? (
        <span className="shrink-0 font-medium text-muted-foreground">{label}</span>
      ) : null}
      <span
        className={cn(
          "min-w-0 break-all",
          typeof value === "string" && label !== null && label !== undefined && "text-foreground",
        )}
        title={text.length > 120 ? text : undefined}
      >
        {truncated}
      </span>
    </div>
  );
}

function JsonTree({
  data,
  label,
  depth = 0,
}: {
  data: unknown;
  label?: ReactNode;
  depth?: number;
}) {
  if (Array.isArray(data)) {
    return (
      <details open={depth < 2}>
        <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground">
          {label ?? "Array"} · {data.length} item{data.length === 1 ? "" : "s"}
        </summary>
        <div className="ml-3 border-l border-border pl-2">
          {data.map((item, index) => (
            <JsonTree key={index} data={item} depth={depth + 1} />
          ))}
        </div>
      </details>
    );
  }
  if (typeof data === "object" && data !== null) {
    const entries = Object.entries(data as Record<string, unknown>);
    return (
      <details open={depth < 2}>
        <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground">
          {label ?? "Object"} · {entries.length} field{entries.length === 1 ? "" : "s"}
        </summary>
        <div className="ml-3 border-l border-border pl-2">
          {entries.map(([key, value]) => (
            <JsonTree key={key} data={value} label={key} depth={depth + 1} />
          ))}
        </div>
      </details>
    );
  }
  return <JsonLeaf label={label} value={data} />;
}

function JsonTreeRoot({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-2.5">
      {Object.entries(data).map(([key, value]) => (
        <JsonTree key={key} data={value} label={key} />
      ))}
    </div>
  );
}

// --- Panel body ---------------------------------------------------------------

function InspectorBody({
  output,
  definitions,
  selectedTab,
  selectedAgent,
}: {
  output: RunOutput;
  definitions: AgentDefinition[] | undefined;
  selectedTab: string;
  selectedAgent: string | null;
}) {
  const nameFor = (key: string) =>
    definitions?.find((definition) => definition.key === key)?.name ?? key;
  const tab = artifactTabByKey(selectedTab);
  const inspectedAgent = selectedAgent ?? tab.agentKey;
  const step = [...output.steps].reverse().find((item) => item.agent === inspectedAgent);
  const json = structuredJson(step);

  return (
    <div className="space-y-3 p-3">
      <div className="rounded-md border border-border bg-muted/30 p-2.5">
        <div className="flex items-center gap-2">
          <RunStatusBadge status={output.run.status} />
          <ModeBadge mode={output.run.mode} />
        </div>
        <dl className="mt-2 space-y-1 text-[11px]">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Run</dt>
            <dd className="font-mono">{output.run.id.slice(0, 8)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Created</dt>
            <dd>{formatTime(output.run.created_at)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Finished</dt>
            <dd>{formatTime(output.run.finished_at) || "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Progress</dt>
            <dd className="tabular-nums">{output.run.progress}%</dd>
          </div>
        </dl>
      </div>

      {step ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold">{nameFor(step.agent)}</h3>
            <StepStatusBadge status={step.status} />
          </div>
          <dl className="space-y-1 text-[11px] text-muted-foreground">
            <div className="flex justify-between gap-2">
              <dt>Duration</dt>
              <dd className="tabular-nums text-foreground">
                {step.duration_ms !== null && step.duration_ms !== undefined
                  ? `${(step.duration_ms / 1000).toFixed(1)}s`
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Started</dt>
              <dd>{formatTime(step.started_at)}</dd>
            </div>
          </dl>
          {json ? <JsonTreeRoot data={json} /> : null}
        </div>        ) : (
        <p className="text-[11px] text-muted-foreground">
          {nameFor(inspectedAgent)} has not produced output yet.
        </p>
      )}
    </div>
  );
}

function SelectedAgentPin({
  label,
  onClear,
}: {
  label: string | null;
  onClear: () => void;
}) {
  if (!label) {
    return null;
  }
  return (
    <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
      <span className="truncate">Inspecting: {label}</span>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto shrink-0 rounded px-1.5 py-0.5 font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Follow tab
      </button>
    </div>
  );
}

function LogsBody({ output }: { output: RunOutput }) {
  const rows = useMemo(() => {
    const lines: Array<{ id: string; time: string; agent: string; text: string }> = [];
    for (const step of output.steps) {
      for (const line of step.logs ?? []) {
        lines.push({
          id: `${step.id}:${line}`,
          time: formatTime(step.finished_at ?? step.started_at),
          agent: step.agent,
          text: line,
        });
      }
    }
    return lines;
  }, [output]);

  if (rows.length === 0) {
    return (
      <p className="p-3 text-center text-[11px] text-muted-foreground">No logs recorded yet.</p>
    );
  }
  return (
    <ul className="workspace-scroll max-h-full space-y-0.5 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed">
      {rows.map((row) => (
        <li key={row.id} className="flex gap-2">
          <span className="shrink-0 tabular-nums text-muted-foreground/70">{row.time}</span>
          <span className="shrink-0 text-info">[{row.agent}]</span>
          <span className="min-w-0 break-words text-foreground/90">{row.text}</span>
        </li>
      ))}
    </ul>
  );
}

function TimelineBody({
  output,
  definitions,
  onSelectAgent,
}: {
  output: RunOutput;
  definitions: AgentDefinition[] | undefined;
  onSelectAgent: (agentKey: string) => void;
}) {
  const nameFor = (key: string) =>
    definitions?.find((definition) => definition.key === key)?.name ?? key;
  const completed = output.steps.filter(
    (step) => step.status === "completed" || step.status === "failed",
  );

  if (completed.length === 0) {
    return (
      <p className="p-3 text-center text-[11px] text-muted-foreground">
        Completed agents will appear here with timestamps.
      </p>
    );
  }

  return (
    <ol className="workspace-scroll max-h-full space-y-1 overflow-y-auto p-2">
      {completed.map((step) => {
        const meta = STATUS_ICON[step.status];
        const Icon = meta.icon;
        return (
          <li
            key={step.id}
            className="group flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5"
          >
            <Icon className={cn("size-3.5 shrink-0", meta.className)} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium">{nameFor(step.agent)}</p>
              <p className="text-[10px] tabular-nums text-muted-foreground">
                {formatTime(step.started_at)} → {formatTime(step.finished_at)}
                {step.duration_ms !== null && step.duration_ms !== undefined
                  ? ` · ${(step.duration_ms / 1000).toFixed(1)}s`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectAgent(step.agent)}
              title={`Replay ${nameFor(step.agent)} artifact`}
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Right IDE panel — Output Inspector, Logs, and replayable Timeline. */
export function RightPanel({
  output,
  definitions,
  selectedTab,
  selectedAgent,
  rightTab,
  outputLoading,
  onRightTabChange,
  onSelectAgent,
  onClearAgent,
}: RightPanelProps) {
  const nameFor = (key: string) =>
    definitions?.find((definition) => definition.key === key)?.name ?? key;

  return (
    <aside className="flex h-full min-w-0 flex-col border-l border-border bg-card">
      <Tabs value={rightTab} onValueChange={(value) => onRightTabChange(value as RightTab)} className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-border p-2">
          <TabsList className="w-full">
            <TabsTrigger value="inspector" className="flex-1">
              Inspector
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex-1">
              Logs
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex-1">
              Timeline
            </TabsTrigger>
          </TabsList>
        </div>

        <SelectedAgentPin label={selectedAgent ? nameFor(selectedAgent) : null} onClear={onClearAgent} />

        <div className="workspace-scroll min-h-0 flex-1 overflow-y-auto">
          <TabsContent value="inspector" className="h-full">
            {outputLoading && !output ? (
              <div className="space-y-3 p-3" aria-hidden="true">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : output ? (
              <InspectorBody
                output={output}
                definitions={definitions}
                selectedTab={selectedTab}
                selectedAgent={selectedAgent}
              />
            ) : (
              <p className="p-3 text-center text-[11px] text-muted-foreground">
                Select a run to inspect its output.
              </p>
            )}
          </TabsContent>
          <TabsContent value="logs" className="h-full">
            {output ? <LogsBody output={output} /> : <p className="p-3 text-center text-[11px] text-muted-foreground">No logs yet.</p>}
          </TabsContent>
          <TabsContent value="timeline" className="h-full">
            {output ? (
              <TimelineBody output={output} definitions={definitions} onSelectAgent={onSelectAgent} />
            ) : (
              <p className="p-3 text-center text-[11px] text-muted-foreground">No completed agents yet.</p>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}
