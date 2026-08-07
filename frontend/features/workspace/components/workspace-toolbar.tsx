"use client";

import Link from "next/link";
import {
  CircleStop,
  Eraser,
  Keyboard,
  Loader2,
  Network,
  Pause,
  Play,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Project } from "@/services/projects";

export interface WorkspaceToolbarProps {
  project: Project | undefined;
  projectLoading: boolean;
  /** Project id for the Architecture / Documentation / Deployment deep links. */
  projectId?: string | null;
  runActive: boolean;
  /** True while the start-run request is in flight (submit feedback). */
  runPending: boolean;
  paused: boolean;
  canRun: boolean;
  hasRun: boolean;
  /** Last manual save time (Ctrl/⌘ + S), shown as a subtle confirmation. */
  savedAt?: string | null;
  onNewProject: () => void;
  onGenerateArchitecture: () => void;
  onRun: () => void;
  onTogglePause: () => void;
  onCancel: () => void;
  onClear: () => void;
  onHelp: () => void;
}

/** Workspace command bar: project context + pipeline controls (Phase 3.6). */
export function WorkspaceToolbar({
  project,
  projectLoading,
  projectId,
  runActive,
  runPending,
  paused,
  canRun,
  hasRun,
  savedAt,
  onNewProject,
  onGenerateArchitecture,
  onRun,
  onTogglePause,
  onCancel,
  onClear,
  onHelp,
}: WorkspaceToolbarProps) {
  const title = project?.name ?? (projectLoading ? "Loading project…" : "Standalone workspace");

  return (
    <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">Agent Workspace</p>
        <p className="flex items-center gap-2 truncate text-xs text-muted-foreground">
          <span className="truncate">{title}</span>
          {savedAt ? <span className="shrink-0 tabular-nums">· Saved {savedAt}</span> : null}
        </p>
      </div>

      <Button
        variant="outline"
        size="sm"
        title="Create a new project and open it in the workspace"
        onClick={onNewProject}
      >
        <Plus aria-hidden="true" />
        New Project
      </Button>

      <Button
        variant="outline"
        size="sm"
        disabled={runActive || !canRun}
        title="Run the pipeline and focus the architecture artifact"
        onClick={onGenerateArchitecture}
      >
        <Network aria-hidden="true" />
        Generate Architecture
      </Button>

      <Button
        size="sm"
        disabled={runPending || runActive || !canRun}
        title={
          runPending
            ? "Starting the pipeline…"
            : runActive
              ? "Pipeline in progress"
              : !canRun
                ? "Add project requirements to enable the pipeline"
                : "Run all ten agents (Ctrl/⌘ + Enter)"
        }
        onClick={onRun}
      >
        {runPending ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <Play aria-hidden="true" />
        )}
        {runPending ? "Starting…" : "Run Agents"}
      </Button>

      <Button
        variant={paused ? "secondary" : "outline"}
        size="sm"
        disabled={!runActive}
        title={paused ? "Resume live updates (Ctrl/⌘ + P)" : "Pause live updates (Ctrl/⌘ + P)"}
        onClick={onTogglePause}
        className={cn(paused && runActive && "border-primary/40 text-primary")}
      >
        {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
        {paused ? "Resume" : "Pause"}
      </Button>

      <Button
        variant="outline"
        size="sm"
        disabled={!runActive}
        title="Cancel the active run (Ctrl/⌘ + Shift + X)"
        onClick={onCancel}
        className="text-destructive hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
      >
        <CircleStop aria-hidden="true" />
        Cancel
      </Button>

      <Button
        variant="ghost"
        size="sm"
        disabled={!hasRun}
        title="Clear workspace output (Ctrl/⌘ + Shift + K)"
        onClick={onClear}
      >
        <Eraser aria-hidden="true" />
        Clear
      </Button>

      {projectId ? (
        <Link
          href={`/architecture?project=${projectId}`}
          className="inline-flex h-8 items-center gap-2 rounded-md border border-input bg-card px-3 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Network aria-hidden="true" />
          Open Architecture
        </Link>
      ) : null}

      <Button
        variant="ghost"
        size="icon"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (? or Ctrl/⌘ + /)"
        onClick={onHelp}
      >
        <Keyboard aria-hidden="true" />
      </Button>
    </div>
  );
}
