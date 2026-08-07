"use client";

import { ArrowLeft, FolderKanban, Settings2, SquareStack } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/providers/session-provider";
import { ApiError } from "@/services/http-client";
import { useProject } from "../hooks/use-projects";
import { ProjectDangerZone } from "./project-danger-zone";
import { ProjectOverview } from "./project-overview";
import { ProjectRequirements } from "./project-requirements";
import { ProjectSettingsForm } from "./project-settings-form";
import { ProjectStatusBadge } from "./project-status-badge";

export function ProjectDetailPage({ projectId }: { projectId: string }) {
  const { user, status } = useSession();
  const canManage =
    status === "authenticated" && (user?.role === "admin" || user?.role === "developer");
  const [tab, setTab] = useState("overview");

  const query = useProject(projectId);
  const project = query.data;

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (query.isError || project === undefined) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-card/50 px-6 py-20 text-center">
        <div
          className="flex size-12 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground"
          aria-hidden="true"
        >
          <FolderKanban className="size-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight">
            {notFound ? "Project not found" : "Unable to load project"}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {notFound
              ? "The project does not exist or you do not have access to it."
              : "The project service did not respond. Check the connection and retry."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {notFound ? null : (
            <Button variant="outline" size="sm" onClick={() => query.refetch()}>
              Retry
            </Button>
          )}
          <Link href="/projects">
            <Button variant="outline" size="sm">
              <ArrowLeft aria-hidden="true" />
              Back to projects
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Projects", href: "/projects" },
            { label: project.name },
          ]}
        />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
              <ProjectStatusBadge status={project.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {project.description || "No description provided."}
            </p>
          </div>
          {canManage ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTab("settings")}
              aria-pressed={tab === "settings"}
            >
              <Settings2 aria-hidden="true" />
              Project settings
            </Button>
          ) : null}
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <SquareStack aria-hidden="true" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          {canManage ? (
            <TabsTrigger value="settings">
              <Settings2 aria-hidden="true" />
              Settings
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <ProjectOverview project={project} />
        </TabsContent>

        <TabsContent value="requirements" className="mt-6">
          <ProjectRequirements project={project} />
        </TabsContent>

        {canManage ? (
          <TabsContent value="settings" className="mt-6 space-y-6">
            <Card>
              <CardContent className="p-6">
                <ProjectSettingsForm project={project} />
              </CardContent>
            </Card>
            <ProjectDangerZone project={project} />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
