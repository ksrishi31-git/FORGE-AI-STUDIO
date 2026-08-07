"use client";

import { useQuery } from "@tanstack/react-query";

import { agentsApi, type AgentStep, type RunOutput } from "@/services/agents";

export interface RunSource {
  /** Latest completed run id for the project, or undefined. */
  runId: string | undefined;
  output: RunOutput | undefined;
  steps: AgentStep[] | undefined;
  isLoading: boolean;
  /** True when the project has no completed run yet. */
  empty: boolean;
  error: boolean;
  refetch: () => void;
}

/**
 * Shared data source for the Architecture / Documentation / Deployment centers
 * (Phase 3.7–3.9): resolves the most recent *completed* pipeline run for a
 * project and loads its full output. Reuses the Phase 3.5 engine endpoints —
 * no duplicated agent logic.
 */
export function useRunSource(projectId: string | undefined): RunSource {
  const history = useQuery({
    queryKey: ["agents", "history", "project", projectId ?? "none"],
    queryFn: () =>
      agentsApi.history({ project_id: projectId, page_size: 10, page: 1 }),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });

  const items = history.data?.items ?? [];
  // History is ordered newest-first; pick the newest run that actually
  // completed so the centers never show a partial/failed artifact set.
  const completed = items.find((item) => item.status === "completed");
  const runId = completed?.id;

  const output = useQuery({
    queryKey: ["agents", "output", runId ?? "none"],
    queryFn: () => agentsApi.output(runId as string),
    enabled: Boolean(runId),
    staleTime: 60_000,
    retry: false,
  });

  // `isPending` (data === undefined) is used instead of `isLoading` so the
  // skeleton branch also holds during SSR, where react-query never fetches and
  // `isLoading` (pending && fetching) is false. Gated on `projectId` so the
  // disabled query (no project selected) is not mistaken for loading.
  const hasProject = Boolean(projectId);
  return {
    runId,
    output: output.data,
    steps: output.data?.steps,
    isLoading:
      hasProject &&
      (history.isPending || (history.isSuccess && Boolean(runId) && output.isPending)),
    empty: hasProject && history.isSuccess && items.length === 0 && !history.isError,
    error: history.isError || output.isError,
    refetch: () => {
      void history.refetch();
      void output.refetch();
    },
  };
}
