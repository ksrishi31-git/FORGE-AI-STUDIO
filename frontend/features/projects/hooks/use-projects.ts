"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import {
  projectsApi,
  type CreateProjectInput,
  type Project,
  type ProjectListParams,
  type UpdateProjectInput,
} from "@/services/projects";

export function useProjects(params: ProjectListParams) {
  return useQuery({
    queryKey: ["projects", "list", params],
    queryFn: () => projectsApi.list(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["projects", "detail", id],
    queryFn: () => projectsApi.get(id as string),
    enabled: Boolean(id),
    retry: false,
  });
}
function useProjectCache() {
  const queryClient = useQueryClient();
  return {
    refreshListsAndDashboard: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projects", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] }),
      ]),
    setDetail: (project: Project) =>
      queryClient.setQueryData<Project>(["projects", "detail", project.id], project),
  };
}

export function useCreateProject() {
  const cache = useProjectCache();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: CreateProjectInput) => projectsApi.create(data),
    onSuccess: async (project) => {
      cache.setDetail(project);
      await cache.refreshListsAndDashboard();
      router.push(`/projects/${project.id}`);
    },
  });
}

export function useUpdateProject(id: string) {
  const cache = useProjectCache();

  return useMutation({
    mutationFn: (data: UpdateProjectInput) => projectsApi.update(id, data),
    onSuccess: async (project) => {
      // The server response is authoritative: write it to the detail cache
      // directly and refresh only the derived lists.
      cache.setDetail(project);
      await cache.refreshListsAndDashboard();
    },
  });
}

export function useDeleteProject(id: string) {
  const cache = useProjectCache();
  const router = useRouter();

  return useMutation({
    mutationFn: () => projectsApi.remove(id),
    onSuccess: async () => {
      await cache.refreshListsAndDashboard();
      router.push("/projects");
    },
  });
}

export function useArchiveProject(id: string) {
  const cache = useProjectCache();

  return useMutation({
    mutationFn: () => projectsApi.archive(id),
    onSuccess: async (project) => {
      cache.setDetail(project);
      await cache.refreshListsAndDashboard();
    },
  });
}

export function useRestoreProject(id: string) {
  const cache = useProjectCache();

  return useMutation({
    mutationFn: () => projectsApi.restore(id),
    onSuccess: async (project) => {
      cache.setDetail(project);
      await cache.refreshListsAndDashboard();
    },
  });
}
