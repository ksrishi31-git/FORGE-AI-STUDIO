"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { getHealth } from "@/services/health";
import { http } from "@/services/http-client";

const readinessSchema = z.object({
  status: z.string(),
  components: z.array(
    z.object({
      name: z.string(),
      status: z.string(),
      detail: z.string().nullable().optional(),
    }),
  ),
});

export interface HealthSnapshot {
  status: "ok" | "partial" | "unreachable";
  service: string;
  version: string;
  components: Array<{ name: string; status: string; detail?: string | null }>;
}

/**
 * Live platform health for the Deployment Center (Phase 3.9): pings the
 * public health endpoint plus the readiness probe and reports per-component
 * status. A failure to reach the API surfaces as `unreachable`.
 */
export function usePlatformHealth(): HealthSnapshot {
  const health = useQuery({
    queryKey: ["deployment", "health"],
    queryFn: getHealth,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const readiness = useQuery({
    queryKey: ["deployment", "readyz"],
    queryFn: () => http.get("/readyz", readinessSchema),
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: false,
  });

  if (health.isError) {
    return { status: "unreachable", service: "unknown", version: "—", components: [] };
  }

  const components = readiness.data?.components ?? [];
  const degraded = components.some((component) => component.status !== "ok");
  return {
    status: readiness.isError || degraded ? "partial" : "ok",
    service: health.data?.service ?? "unknown",
    version: health.data?.version ?? "—",
    components,
  };
}
