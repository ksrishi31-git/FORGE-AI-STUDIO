"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { agentsApi, type RunRequest } from "@/services/agents";

export function useAgentDefinitions() {
  return useQuery({
    queryKey: ["agents", "definitions"],
    queryFn: agentsApi.definitions,
    staleTime: 10 * 60_000,
  });
}

export function useRunPipeline() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: RunRequest) => agentsApi.run(data),
    onSuccess: async (accepted) => {
      await queryClient.invalidateQueries({ queryKey: ["agents", "history"] });
      router.push(`/agents?run=${accepted.run_id}`);
    },
  });
}

export function useRetryRun() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (id: string) => agentsApi.retry(id),
    onSuccess: async (accepted) => {
      await queryClient.invalidateQueries({ queryKey: ["agents", "history"] });
      router.push(`/agents?run=${accepted.run_id}`);
    },
  });
}

export function useAgentRunStatus(id: string | undefined, polling: boolean) {
  return useQuery({
    queryKey: ["agents", "status", id],
    queryFn: () => agentsApi.status(id as string),
    enabled: Boolean(id),
    refetchInterval: polling ? 1500 : false,
    retry: false,
  });
}

export function useAgentRunOutput(id: string | undefined, polling: boolean) {
  return useQuery({
    queryKey: ["agents", "output", id],
    queryFn: () => agentsApi.output(id as string),
    enabled: Boolean(id),
    refetchInterval: polling ? 1500 : false,
    retry: false,
  });
}

export function useAgentHistory(page: number) {
  return useQuery({
    queryKey: ["agents", "history", page],
    queryFn: () => agentsApi.history({ page, page_size: 8 }),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useDeleteRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => agentsApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agents", "history"] });
    },
  });
}
