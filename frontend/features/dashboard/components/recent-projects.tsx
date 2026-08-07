"use client";

import Link from "next/link";
import { ArrowRight, FolderKanban, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectStatus, ProjectSummary } from "@/services/dashboard";
import { EmptyState } from "./empty-state";
import { SectionError } from "./section-error";

const STATUS_VARIANT: Record<ProjectStatus, "muted" | "info" | "success" | "destructive"> = {
  planning: "muted",
  in_progress: "info",
  completed: "success",
  failed: "destructive",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export interface RecentProjectsProps {
  projects: ProjectSummary[];
  isLoading: boolean;
  error: boolean;
  onRetry: () => void;
}

export function RecentProjects({ projects, isLoading, error, onRetry }: RecentProjectsProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Recent projects</CardTitle>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View all
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <SectionError onRetry={onRetry} />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="size-4" />}
            title="No projects yet"
            description="Create your first project to start an autonomous agent run."
            action={
              <Link href="/projects">
                <Button size="sm">
                  <Plus aria-hidden="true" />
                  Create project
                </Button>
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {projects.map((project) => (
              <li key={project.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/projects/${project.id}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {project.name}
                    </Link>
                    <Badge variant={STATUS_VARIANT[project.status]}>
                      {project.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Owned by {project.owner} · Created {formatDate(project.created_at)}
                  </p>
                </div>
                <div className="w-24 shrink-0 space-y-1">
                  <Progress value={project.progress} aria-label={`${project.name} progress`} />
                  <p className="text-right text-xs text-muted-foreground">
                    {Math.round(project.progress)}%
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
