/**
 * Dashboard API service (BAD §5 — the dashboard aggregates the Projects,
 * Agents, Activity, and Telemetry endpoints).
 *
 * The dashboard modules are not deployed on the backend yet. Every request
 * that returns 404 (module not implemented) resolves to an empty dataset so
 * the UI renders its designed empty states; the schemas below are the frontend
 * half of the contract and activate the moment the backend ships the module.
 */
import { z } from "zod";

import { ApiError, http } from "./http-client";

// --- Schemas & types ----------------------------------------------------------

// Mirrors the backend ProjectStatus contract (Phase 3.4). Archiving is a
// separate boolean flag, not a lifecycle status.
export const projectStatusSchema = z.enum(["planning", "in_progress", "completed", "failed"]);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const projectSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  status: projectStatusSchema,
  progress: z.number().min(0).max(100),
  owner: z.string(),
  created_at: z.string(),
});
export type ProjectSummary = z.infer<typeof projectSummarySchema>;

export const agentStatusSchema = z.enum(["idle", "working", "reviewing", "blocked", "error"]);
export type AgentStatus = z.infer<typeof agentStatusSchema>;

export const agentSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  role: z.string(),
  status: agentStatusSchema,
  current_task: z.string().nullable(),
  health: z.number().min(0).max(100),
  progress: z.number().min(0).max(100),
});
export type AgentSummary = z.infer<typeof agentSummarySchema>;

export const activityTypeSchema = z.enum([
  "project_created",
  "architecture_generated",
  "backend_completed",
  "deployment_started",
  "documentation_generated",
  "agent_status",
  "other",
]);
export type ActivityType = z.infer<typeof activityTypeSchema>;

export const activityEventSchema = z.object({
  id: z.string().uuid(),
  type: activityTypeSchema,
  message: z.string(),
  project: z.string().nullable(),
  created_at: z.string(),
});
export type ActivityEvent = z.infer<typeof activityEventSchema>;

export const dashboardStatsSchema = z.object({
  total_projects: z.number(),
  active_agents: z.number(),
  tasks_completed: z.number(),
  deployments: z.number(),
  code_generated_files: z.number(),
});
export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

export const weeklyProjectsSchema = z.object({
  week: z.string(),
  projects: z.number(),
});
export type WeeklyProjectsPoint = z.infer<typeof weeklyProjectsSchema>;

export const agentActivitySchema = z.object({
  date: z.string(),
  executions: z.number(),
});
export type AgentActivityPoint = z.infer<typeof agentActivitySchema>;

export const deploymentHistorySchema = z.object({
  date: z.string(),
  builds: z.number(),
  failures: z.number(),
});
export type DeploymentHistoryPoint = z.infer<typeof deploymentHistorySchema>;

export const EMPTY_STATS: DashboardStats = {
  total_projects: 0,
  active_agents: 0,
  tasks_completed: 0,
  deployments: 0,
  code_generated_files: 0,
};

/** Pagination convention (BAD §5 — Page<T>). */
function pageOf<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number(),
    page: z.number(),
    page_size: z.number(),
  });
}

async function getOrEmpty<T>(request: Promise<T>, fallback: T): Promise<T> {
  try {
    return await request;
  } catch (error) {
    // 404 = module not implemented yet; the UI owns the empty state.
    if (error instanceof ApiError && error.status === 404) {
      return fallback;
    }
    throw error;
  }
}

// --- Service ------------------------------------------------------------------

export const dashboardApi = {
  getStats: () =>
    getOrEmpty(http.get("/api/v1/dashboard/stats", dashboardStatsSchema), EMPTY_STATS),

  getRecentProjects: () =>
    getOrEmpty(http.get("/api/v1/projects?page_size=5", pageOf(projectSummarySchema)), {
      items: [],
      total: 0,
      page: 1,
      page_size: 5,
    }),

  getActiveAgents: () =>
    getOrEmpty(http.get("/api/v1/agents?page_size=10", pageOf(agentSummarySchema)), {
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
    }),

  getActivity: () =>
    getOrEmpty(http.get("/api/v1/activity?page_size=10", pageOf(activityEventSchema)), {
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
    }),

  getProjectsPerWeek: () =>
    getOrEmpty(
      http.get("/api/v1/dashboard/telemetry/projects-per-week", z.array(weeklyProjectsSchema)),
      [],
    ),

  getAgentActivity: () =>
    getOrEmpty(
      http.get("/api/v1/dashboard/telemetry/agent-activity", z.array(agentActivitySchema)),
      [],
    ),

  getDeploymentHistory: () =>
    getOrEmpty(
      http.get("/api/v1/dashboard/telemetry/deployments", z.array(deploymentHistorySchema)),
      [],
    ),
};
