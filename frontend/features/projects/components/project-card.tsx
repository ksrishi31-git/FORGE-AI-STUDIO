import { Archive, CalendarDays, FolderKanban, User } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ProjectSummary } from "@/services/projects";
import { formatDate } from "../lib/format";
import { ProjectPriorityBadge, ProjectStatusBadge } from "./project-status-badge";

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card
        className={cn(
          "h-full p-5 transition-colors group-hover:border-primary/50 group-hover:bg-accent/30",
          project.archived && "opacity-70",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"
              aria-hidden="true"
            >
              <FolderKanban className="size-4" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold tracking-tight">{project.name}</h3>
              <p className="truncate text-xs text-muted-foreground">
                {project.slug}
                {project.archived ? " · archived" : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {project.archived ? (
              <Archive className="size-4 text-muted-foreground" aria-hidden="true" />
            ) : null}
            <ProjectStatusBadge status={project.status} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1.5">
          <ProjectPriorityBadge priority={project.priority} />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Pipeline progress</span>
            <span className="tabular-nums">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="mt-1.5 h-1.5" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <User className="size-3.5" aria-hidden="true" />
            {project.owner}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {formatDate(project.created_at)}
          </span>
        </div>
      </Card>
    </Link>
  );
}
