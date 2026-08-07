"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { agentsApi, type RunRequest } from "@/services/agents";

/** Start a pipeline from the workspace (reuses POST /agents/run — Phase 3.5). */
export function useWorkspaceRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RunRequest) => agentsApi.run(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agents", "history"] });
    },
  });
}

/** Resume a failed run from the failed agent (POST /agents/retry — Phase 4.0). */
export function useRetryWorkspaceRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => agentsApi.retry(id),
    onSuccess: async (accepted) => {
      await queryClient.invalidateQueries({ queryKey: ["agents", "history"] });
      return accepted;
    },
  });
}

/** Cancel a queued/running pipeline (POST /agents/cancel). */
export function useCancelRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => agentsApi.cancel(id),
    onSuccess: async (run) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agents", "status", run.id] }),
        queryClient.invalidateQueries({ queryKey: ["agents", "output", run.id] }),
        queryClient.invalidateQueries({ queryKey: ["agents", "history"] }),
      ]);
    },
  });
}
