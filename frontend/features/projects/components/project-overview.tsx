import { CalendarDays, Globe, Layers, Target, User } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Project } from "@/services/projects";
import { formatDate } from "../lib/format";
import { ProjectPriorityBadge, ProjectStatusBadge } from "./project-status-badge";

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-1 text-sm">{value}</div>
      </div>
    </div>
  );
}

export function ProjectOverview({ project }: { project: Project }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          {project.description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{project.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No description provided.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetaRow
            icon={<Globe className="size-4" />}
            label="Business domain"
            value={project.business_domain ?? "Not specified"}
          />
          <MetaRow
            icon={<Target className="size-4" />}
            label="Target users"
            value={project.target_users ?? "Not specified"}
          />
          <MetaRow
            icon={<Layers className="size-4" />}
            label="Preferred stack"
            value={
              project.preferred_stack && project.preferred_stack.length > 0 ? (
                <span className="flex flex-wrap gap-1.5">
                  {project.preferred_stack.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {tech}
                    </span>
                  ))}
                </span>
              ) : (
                "Not specified"
              )
            }
          />
          <MetaRow
            icon={<User className="size-4" />}
            label="Owner"
            value={<span className="font-medium">{project.owner}</span>}
          />
          <MetaRow
            icon={<CalendarDays className="size-4" />}
            label="Created"
            value={formatDate(project.created_at)}
          />
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>State</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <ProjectStatusBadge status={project.status} />
          <ProjectPriorityBadge priority={project.priority} />
          <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {project.visibility}
          </span>
          {project.archived ? (
            <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Archived
            </span>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
