import { useQuery } from "@tanstack/react-query";

import {
  dashboardApi,
  EMPTY_STATS,
  type ActivityEvent,
  type AgentActivityPoint,
  type AgentSummary,
  type DashboardStats,
  type DeploymentHistoryPoint,
  type ProjectSummary,
  type WeeklyProjectsPoint,
} from "@/services/dashboard";

export type DashboardAvailability = "ok" | "partial" | "unreachable";

export interface DashboardOverview {
  stats: DashboardStats;
  projects: ProjectSummary[];
  agents: AgentSummary[];
  activity: ActivityEvent[];
  projectsPerWeek: WeeklyProjectsPoint[];
  agentActivity: AgentActivityPoint[];
  deployments: DeploymentHistoryPoint[];
  availability: DashboardAvailability;
  errors: {
    stats: boolean;
    projects: boolean;
    agents: boolean;
    activity: boolean;
    charts: boolean;
  };
}

/**
 * Aggregated dashboard query (FAD §7 — Dashboard).
 *
 * Module endpoints return 404 until the backend ships them; the service layer
 * resolves those to empty datasets so the UI renders its designed empty
 * states. Genuine failures (500, network, schema drift) are surfaced per
 * section through the `errors` map and the `availability` summary instead of
 * being masked as empty data.
 */
export function useDashboardOverview() {
  return useQuery<DashboardOverview>({
    queryKey: ["dashboard", "overview"],
    queryFn: async () => {
      const [statsR, projectsR, agentsR, activityR, weeklyR, agentActivityR, deploymentsR] =
        await Promise.allSettled([
          dashboardApi.getStats(),
          dashboardApi.getRecentProjects(),
          dashboardApi.getActiveAgents(),
          dashboardApi.getActivity(),
          dashboardApi.getProjectsPerWeek(),
          dashboardApi.getAgentActivity(),
          dashboardApi.getDeploymentHistory(),
        ]);

      const rejected = [
        statsR,
        projectsR,
        agentsR,
        activityR,
        weeklyR,
        agentActivityR,
        deploymentsR,
      ].filter((result) => result.status === "rejected").length;

      const availability: DashboardAvailability =
        rejected === 0 ? "ok" : rejected === 7 ? "unreachable" : "partial";

      return {
        stats: statsR.status === "fulfilled" ? statsR.value : EMPTY_STATS,
        projects: projectsR.status === "fulfilled" ? projectsR.value.items : [],
        agents: agentsR.status === "fulfilled" ? agentsR.value.items : [],
        activity: activityR.status === "fulfilled" ? activityR.value.items : [],
        projectsPerWeek: weeklyR.status === "fulfilled" ? weeklyR.value : [],
        agentActivity: agentActivityR.status === "fulfilled" ? agentActivityR.value : [],
        deployments: deploymentsR.status === "fulfilled" ? deploymentsR.value : [],
        availability,
        errors: {
          stats: statsR.status === "rejected",
          projects: projectsR.status === "rejected",
          agents: agentsR.status === "rejected",
          activity: activityR.status === "rejected",
          charts:
            weeklyR.status === "rejected" ||
            agentActivityR.status === "rejected" ||
            deploymentsR.status === "rejected",
        },
      };
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
