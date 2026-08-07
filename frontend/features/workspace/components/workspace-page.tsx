"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/services/http-client";
import {
  useAgentDefinitions,
  useAgentRunOutput,
  useAgentRunStatus,
} from "@/features/agents/hooks/use-agents";
import { useProject } from "@/features/projects/hooks/use-projects";
import { useKeyboardShortcuts, type ShortcutAction } from "../hooks/use-keyboard-shortcuts";
import { useCancelRun, useRetryWorkspaceRun, useWorkspaceRun } from "../hooks/use-workspace-run";
import { useWorkspaceState } from "../hooks/use-workspace-state";
import { ARTIFACT_TABS, artifactTabByKey, artifactTabForAgent } from "../lib/artifacts";
import { formatTime } from "../lib/events";
import { ArtifactViewer } from "./artifact-viewer";
import { ConsolePanel } from "./console-panel";
import { LiveExecution } from "./live-execution";
import { NewProjectDialog } from "./new-project-dialog";
import { PipelineSidebar } from "./pipeline-sidebar";
import { RequirementsEditor } from "./requirements-editor";
import { RightPanel } from "./right-panel";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { SplitHandle } from "./split-handle";
import { WorkspaceToolbar } from "./workspace-toolbar";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface WorkspacePageProps {
  projectId: string | null;
  /** Open this run on mount (notification deep-link, Phase 3.10). */
  initialRunId?: string | null;
}

/**
 * The Agent Workspace — the platform's primary IDE (Phase 3.6).
 *
 * Layout: toolbar / [agent pipeline | editor + execution + artifacts | output
 * inspector] / console. The existing LangGraph engine (Phase 3.5) is driven
 * through POST /agents/run and polled for status/output; the session is
 * persisted so unfinished runs reconnect automatically.
 */
export function WorkspacePage({ projectId, initialRunId }: WorkspacePageProps) {
  const queryClient = useQueryClient();
  const project = useProject(projectId ?? undefined);
  const { state, patch, patchSizes, resetRun } = useWorkspaceState(
    projectId,
    project.data?.requirements,
  );
  const appliedRunId = useRef<string | null>(null);

  // A deep link (?run=) opens the referenced run. The guard tracks the last
  // *applied* run id so a plain reload restores the persisted session, while a
  // second notification click (search-param change, no remount) still opens
  // the newly referenced run.
  useEffect(() => {
    if (!initialRunId || appliedRunId.current === initialRunId) {
      return;
    }
    appliedRunId.current = initialRunId;
    patch({ runId: initialRunId, lastStatus: null, paused: false, view: "markdown" });
  }, [initialRunId, patch]);
  const definitions = useAgentDefinitions();
  const runMutation = useWorkspaceRun();
  const retryMutation = useRetryWorkspaceRun();
  const cancelMutation = useCancelRun();

  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);
  // The agent currently inspected in the right panel (null = follow the tab).
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  // --- Run lifecycle & polling -------------------------------------------------
  // One status query; polling is toggled from the observed status so terminal
  // runs stop polling while unfinished (persisted) sessions reconnect.
  const status = useAgentRunStatus(state.runId ?? undefined, polling && !state.paused);
  // Only a definitive 404 means the persisted run is gone (server restart,
  // database reset, deleted run). Transient service errors keep the persisted
  // status so the button stays locked while a run is still executing — a dead
  // session must never silently disable Run Agents, but a network blip must
  // never enable a duplicate run either.
  const statusDead =
    status.isError && status.error instanceof ApiError && status.error.status === 404;
  const liveStatus = statusDead ? null : (status.data?.status ?? state.lastStatus);
  const runActive = liveStatus === "queued" || liveStatus === "running";

  useEffect(() => {
    setPolling(true);
  }, [state.runId]);

  useEffect(() => {
    if (!state.runId) {
      return;
    }
    if (status.isError) {
      setPolling(false);
      return;
    }
    const current = status.data?.status;
    setPolling(current === undefined || current === "queued" || current === "running");
  }, [state.runId, status.data?.status, status.isError]);

  // Keep the persisted session in sync with the last observed status so a
  // reload resumes polling for unfinished runs.
  useEffect(() => {
    if (status.data) {
      patch({ lastStatus: status.data.status });
    }
  }, [status.data, patch]);

  // A persisted session may reference a run that no longer exists (database
  // reset, run deleted, or a crash before the row was written). Clear the
  // dead session so the user can start a new run instead of hitting a
  // silently disabled button; transient errors surface as a retry message.
  useEffect(() => {
    if (!state.runId || !statusDead) {
      return;
    }
    resetRun();
    setRunError("The previous agent run is no longer available. Start a new run.");
  }, [state.runId, statusDead, resetRun]);

  // Polling stops the moment a run turns terminal, so the last polled output
  // snapshot can miss the final agents (leaving them on "Waiting in queue"
  // forever). Fetch the complete output once more when the run finishes.
  useEffect(() => {
    if (!state.runId) {
      return;
    }
    const current = status.data?.status;
    if (current !== "completed" && current !== "failed" && current !== "cancelled") {
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["agents", "output", state.runId] });
  }, [state.runId, status.data?.status, queryClient]);

  // Terminal runs create backend notifications (Phase 3.10); refresh the feed
  // when a run finishes so the top-bar badge updates without a manual reload.
  // Keyed by run + status so every run in a session invalidates exactly once.
  const terminalSeen = useRef<string | null>(null);
  useEffect(() => {
    const current = status.data?.status;
    if (!current || (current !== "completed" && current !== "failed" && current !== "cancelled")) {
      return;
    }
    const key = `${state.runId}:${current}`;
    if (terminalSeen.current === key) {
      return;
    }
    terminalSeen.current = key;
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    void queryClient.invalidateQueries({ queryKey: ["agents", "history"] });
  }, [status.data?.status, state.runId, queryClient]);

  const output = useAgentRunOutput(
    state.runId ?? undefined,
    Boolean(state.runId) && !state.paused && runActive,
  );
  const steps = output.data?.steps;

  // --- Actions -----------------------------------------------------------------
  const handleRun = useCallback(
    async (focusTab?: string) => {
      // Debug tracing for the run pipeline (requested instrumentation).
      console.log("Run Agents clicked");
      if (runMutation.isPending) {
        console.log("Run Agents ignored — a run is already being started");
        return;
      }
      if (runActive || !state.requirements.trim()) {
        console.log("Run Agents skipped —", {
          runActive,
          hasRequirements: Boolean(state.requirements.trim()),
        });
        return;
      }
      setRunError(null);
      const request = {
        project_id: projectId ?? undefined,
        requirements: state.requirements,
        preferred_stack: state.preferredStack.length > 0 ? state.preferredStack : undefined,
        mode: state.mode,
      };
      console.log("Sending project id:", request.project_id ?? "standalone", "· mode:", request.mode);
      try {
        const accepted = await runMutation.mutateAsync(request);
        console.log("API response received:", accepted);
        patch({
          runId: accepted.run_id,
          lastStatus: accepted.status,
          paused: false,
          selectedTab: focusTab ?? state.selectedTab,
          view: "markdown",
        });
      } catch (error) {
        console.error("Run Agents API error:", error);
        setRunError(error instanceof Error ? error.message : "Unable to start the pipeline.");
      }
    },
    [runActive, state, projectId, runMutation, patch],
  );

  const handleRetry = useCallback(async () => {
    if (!state.runId || runActive) {
      return;
    }
    setRunError(null);
    try {
      const accepted = await retryMutation.mutateAsync(state.runId);
      patch({
        runId: accepted.run_id,
        lastStatus: accepted.status,
        paused: false,
      });
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "Unable to retry the pipeline.");
    }
  }, [state.runId, runActive, retryMutation, patch]);

  const handleCancel = useCallback(async () => {
    if (!state.runId || !runActive) {
      return;
    }
    try {
      await cancelMutation.mutateAsync(state.runId);
      patch({ lastStatus: "cancelled", paused: false });
    } catch {
      // The run may already be terminal; the next poll reflects reality.
    }
  }, [state.runId, runActive, cancelMutation, patch]);

  const handleClear = useCallback(() => {
    resetRun();
    setRunError(null);
  }, [resetRun]);

  const handleSelectAgent = useCallback(
    (agentKey: string) => {
      const tab = artifactTabForAgent(agentKey);
      setSelectedAgent(agentKey);
      patch({ rightTab: "inspector", selectedTab: tab?.key ?? state.selectedTab });
    },
    [patch, state.selectedTab],
  );

  const handleSelectTab = useCallback((tabKey: string) => {
    setSelectedAgent(null);
    patch({ selectedTab: tabKey });
  }, [patch]);

  const cycleView = useCallback(() => {
    const order = ["markdown", "json", "mermaid", "code"] as const;
    const index = order.indexOf(state.view);
    patch({ view: order[(index + 1) % order.length] });
  }, [patch, state.view]);

  const togglePause = useCallback(() => {
    if (runActive) {
      patch({ paused: !state.paused });
    }
  }, [patch, runActive, state.paused]);

  // --- Keyboard shortcuts -------------------------------------------------------
  useKeyboardShortcuts(
    [
    { id: "run", binding: { key: "Enter", ctrl: true }, action: () => void handleRun() },
    {
      id: "save",
      binding: { key: "s", ctrl: true },
      action: () => setSavedAt(formatTime(new Date().toISOString())),
    },
    { id: "pause", binding: { key: "p", ctrl: true }, action: togglePause },
    {
      id: "cancel",
      binding: { key: "x", ctrl: true, shift: true },
      action: () => void handleCancel(),
    },
    { id: "clear", binding: { key: "k", ctrl: true, shift: true }, action: handleClear },
    { id: "view", binding: { key: "v", ctrl: true }, action: cycleView },
    {
      id: "fullscreen",
      binding: { key: "f", ctrl: true, shift: true },
      action: () => patch({ fullscreen: !state.fullscreen }),
    },
    {
      id: "help",
      binding: { key: "/", shift: true },
      preventWhileTyping: true,
      action: () => setHelpOpen(true),
    },
    { id: "help-mod", binding: { key: "/", ctrl: true }, action: () => setHelpOpen(true) },
      ...ARTIFACT_TABS.map(
        (tab): ShortcutAction => ({
          id: `tab-${tab.key}`,
          binding: { key: String(tab.shortcut), ctrl: true },
          action: () => handleSelectTab(tab.key),
        }),
      ),
    ],
    !newProjectOpen && !helpOpen,
  );

  // --- Panel resizing ------------------------------------------------------------
  const handleLeftDrag = useCallback(
    (deltaPx: number) => {
      const width = areaRef.current?.clientWidth ?? 1;
      const delta = (deltaPx / width) * 100;
      const left = clamp(state.sizes.left + delta, 14, 36);
      const center = clamp(state.sizes.center - delta, 32, 68);
      patchSizes({ left, center, right: 100 - left - center });
    },
    [patchSizes, state.sizes],
  );

  const handleRightDrag = useCallback(
    (deltaPx: number) => {
      const width = areaRef.current?.clientWidth ?? 1;
      const delta = (deltaPx / width) * 100;
      const right = clamp(state.sizes.right - delta, 18, 42);
      const center = clamp(state.sizes.center + delta, 32, 68);
      patchSizes({ right, center, left: 100 - center - right });
    },
    [patchSizes, state.sizes],
  );

  const handleBottomDrag = useCallback(
    (deltaPx: number) => {
      const height = rootRef.current?.clientHeight ?? 1;
      const delta = (deltaPx / height) * 100;
      patchSizes({ bottom: clamp(state.sizes.bottom - delta, 12, 55) });
    },
    [patchSizes, state.sizes],
  );

  const hasRun = Boolean(state.runId);
  const canRun = Boolean(state.requirements.trim()) && !runActive;
  const runPending = runMutation.isPending;
  const activeTab = artifactTabByKey(state.selectedTab);

  return (
    <div ref={rootRef} className="flex h-[calc(100vh-3.5rem)] min-h-0 flex-col">
      <WorkspaceToolbar
        project={project.data}
        projectLoading={project.isLoading}
        projectId={projectId}
        runActive={runActive}
        runPending={runPending}
        paused={state.paused}
        canRun={canRun}
        hasRun={hasRun}
        savedAt={savedAt}
        onNewProject={() => setNewProjectOpen(true)}
        onGenerateArchitecture={() => void handleRun("architecture")}
        onRun={() => void handleRun()}
        onTogglePause={togglePause}
        onCancel={() => void handleCancel()}
        onClear={handleClear}
        onHelp={() => setHelpOpen(true)}
      />

      <div ref={areaRef} className="flex min-h-0 flex-1">
        <div className="min-w-0" style={{ width: `${state.sizes.left}%` }}>
          <PipelineSidebar
            definitions={definitions.data}
            steps={steps}
            status={status.data}
            loading={definitions.isLoading}
            activeAgentKey={selectedAgent ?? activeTab.agentKey}
            onSelectAgent={handleSelectAgent}
          />
        </div>

        <SplitHandle axis="x" label="Resize pipeline sidebar" onDrag={handleLeftDrag} />

        <div className="flex min-w-0 flex-col" style={{ width: `${state.sizes.center}%` }}>
          {runError ? (
            <Alert variant="destructive" className="m-3 mb-0 flex items-center gap-2 text-xs">
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              {runError}
            </Alert>
          ) : null}

          <RequirementsEditor
            requirements={state.requirements}
            onRequirementsChange={(requirements) => patch({ requirements })}
            preferredStack={state.preferredStack}
            onStackChange={(preferredStack) => patch({ preferredStack })}
            mode={state.mode}
            onModeChange={(mode) => patch({ mode })}
            open={state.editorOpen}
            onToggleOpen={() => patch({ editorOpen: !state.editorOpen })}
          />

          {state.runId && !status.data && !status.isError ? (
            <div className="shrink-0 border-b border-border bg-card p-3" aria-hidden="true">
              <Skeleton className="h-12 w-full" />
            </div>
          ) : null}

          {status.data ? (
            <LiveExecution
              status={status.data}
              output={output.data}
              definitions={definitions.data}
              paused={state.paused}
              onResume={() => patch({ paused: false })}
              onRetry={() => void handleRetry()}
              onSelectAgent={handleSelectAgent}
            />
          ) : null}

          <ArtifactViewer
            output={output.data}
            outputLoading={output.isLoading && !output.data}
            outputError={status.isError || output.isError}
            definitions={definitions.data}
            selectedTab={state.selectedTab}
            view={state.view}
            fullscreen={state.fullscreen}
            runActive={runActive}
            onSelectTab={handleSelectTab}
            onViewChange={(view) => patch({ view })}
            onFullscreenChange={(fullscreen) => patch({ fullscreen })}
            onClear={handleClear}
          />
        </div>

        <SplitHandle axis="x" label="Resize inspector panel" onDrag={handleRightDrag} />

        <div className="min-w-0" style={{ width: `${state.sizes.right}%` }}>
          <RightPanel
            output={output.data}
            definitions={definitions.data}
            selectedTab={state.selectedTab}
            selectedAgent={selectedAgent}
            rightTab={state.rightTab}
            outputLoading={output.isLoading && !output.data}
            onRightTabChange={(rightTab) => patch({ rightTab })}
            onSelectAgent={handleSelectAgent}
            onClearAgent={() => setSelectedAgent(null)}
          />
        </div>
      </div>

      {state.consoleOpen ? (
        <SplitHandle axis="y" label="Resize console height" onDrag={handleBottomDrag} />
      ) : null}

      <div
        className="min-h-0 shrink-0"
        style={state.consoleOpen ? { height: `${state.sizes.bottom}%` } : undefined}
      >
        <ConsolePanel
          status={status.data}
          steps={steps}
          definitions={definitions.data}
          bottomTab={state.bottomTab}
          open={state.consoleOpen}
          onBottomTabChange={(bottomTab) => patch({ bottomTab })}
          onToggleOpen={() => patch({ consoleOpen: !state.consoleOpen })}
        />
      </div>

      <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} />
      <ShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
