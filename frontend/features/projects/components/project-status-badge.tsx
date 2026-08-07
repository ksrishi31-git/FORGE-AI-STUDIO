import { Badge } from "@/components/ui/badge";
import type { ProjectPriority, ProjectStatus } from "@/services/projects";

const STATUS_VARIANT: Record<ProjectStatus, "info" | "default" | "success" | "destructive"> = {
  planning: "info",
  in_progress: "default",
  completed: "success",
  failed: "destructive",
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planning",
  in_progress: "In progress",
  completed: "Completed",
  failed: "Failed",
};

const PRIORITY_VARIANT: Record<ProjectPriority, "muted" | "secondary" | "warning" | "destructive"> =
  {
    low: "muted",
    medium: "secondary",
    high: "warning",
    critical: "destructive",
  };

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function ProjectPriorityBadge({ priority }: { priority: ProjectPriority }) {
  return <Badge variant={PRIORITY_VARIANT[priority]}>{priority}</Badge>;
}
