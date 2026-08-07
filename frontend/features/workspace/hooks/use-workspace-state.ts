"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { loadJson, saveJson, workspaceStorageKey } from "../lib/storage";

export type ArtifactView = "markdown" | "json" | "mermaid" | "code";
export type RightTab = "inspector" | "logs" | "timeline";
export type BottomTab = "console" | "events";
export type RunModeInput = "auto" | "llm" | "deterministic";

export interface PanelSizes {
  /** Left pipeline sidebar width (%). */
  left: number;
  /** Center column width (%). */
  center: number;
  /** Right inspector column width (%). */
  right: number;
  /** Bottom console height (%). */
  bottom: number;
}

export interface WorkspaceState {
  requirements: string;
  preferredStack: string[];
  mode: RunModeInput;
  runId: string | null;
  /** Last observed run status — lets a reloaded page resume polling. */
  lastStatus: string | null;
  selectedTab: string;
  view: ArtifactView;
  rightTab: RightTab;
  bottomTab: BottomTab;
  editorOpen: boolean;
  consoleOpen: boolean;
  paused: boolean;
  fullscreen: boolean;
  sizes: PanelSizes;
}

export const DEFAULT_PANEL_SIZES: PanelSizes = {
  left: 20,
  center: 50,
  right: 30,
  bottom: 22,
};

const DEFAULT_STATE: WorkspaceState = {
  requirements: "",
  preferredStack: [],
  mode: "auto",
  runId: null,
  lastStatus: null,
  selectedTab: "architecture",
  view: "markdown",
  rightTab: "inspector",
  bottomTab: "console",
  editorOpen: true,
  consoleOpen: true,
  paused: false,
  fullscreen: false,
  sizes: DEFAULT_PANEL_SIZES,
};

/**
 * Persistent workspace session state (Phase 3.6).
 *
 * Every change is debounced to localStorage keyed by project so a reload or
 * navigation restores the draft, the active run (reconnecting live polling),
 * the open tabs, and the panel sizes.
 */
export function useWorkspaceState(
  projectId: string | null | undefined,
  projectRequirements: string | null | undefined,
) {
  const storageKey = workspaceStorageKey(projectId);
  const [state, setState] = useState<WorkspaceState>(() => {
    const stored = loadJson<Partial<WorkspaceState>>(storageKey);
    return {
      ...DEFAULT_STATE,
      ...(stored ?? {}),
      sizes: { ...DEFAULT_PANEL_SIZES, ...(stored?.sizes ?? {}) },
    };
  });
  // Prefill the draft from the bound project exactly once per project binding:
  // a later refetch must not re-apply requirements the user deliberately cleared.
  const prefilledFor = useRef<string | null>(null);

  useEffect(() => {
    if (!projectRequirements || prefilledFor.current === storageKey) {
      return;
    }
    setState((current) => {
      const next = current.requirements.trim() ? current : { ...current, requirements: projectRequirements };
      return next;
    });
    prefilledFor.current = storageKey;
  }, [storageKey, projectRequirements]);

  // Debounced persistence.
  useEffect(() => {
    const timer = window.setTimeout(() => saveJson(storageKey, state), 250);
    return () => window.clearTimeout(timer);
  }, [state, storageKey]);

  const patch = useCallback((partial: Partial<WorkspaceState>) => {
    setState((current) => ({ ...current, ...partial }));
  }, []);

  const patchSizes = useCallback((partial: Partial<PanelSizes>) => {
    setState((current) => ({ ...current, sizes: { ...current.sizes, ...partial } }));
  }, []);

  /** Clear the active run and output while keeping the requirements draft. */
  const resetRun = useCallback(() => {
    setState((current) => ({
      ...current,
      runId: null,
      lastStatus: null,
      selectedTab: "architecture",
      view: "markdown",
      rightTab: "inspector",
      bottomTab: "console",
      paused: false,
    }));
  }, []);

  return { state, patch, patchSizes, resetRun };
}
