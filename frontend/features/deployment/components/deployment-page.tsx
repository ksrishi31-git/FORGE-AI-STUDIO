"use client";

import {
  CheckCircle2,
  Circle,
  Download,
  FileCode2,
  FileText,
  FolderKanban,
  KeyRound,
  Rocket,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useRunSource } from "@/features/centers/hooks/use-run-source";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { stepForAgent } from "@/features/workspace/lib/artifacts";
import { stepMarkdown } from "@/services/agents";
import { Markdown } from "@/features/agents/components/markdown";
import { downloadText } from "@/lib/download";
import { cn } from "@/lib/utils";
import { usePlatformHealth } from "../hooks/use-health";
import {
  BUILD_COMMANDS,
  COMPOSE_TEMPLATE,
  DEPLOYMENT_CHECKLIST,
  ENV_VARIABLES,
} from "../lib/deployment";

const CHECKLIST_KEY = "forgeai-deployment-checklist";

function loadChecked(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(CHECKLIST_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function DeploymentPage({ initialProjectId }: { initialProjectId: string | null }) {
  const projectsQuery = useProjects({ page_size: 50 });
  const projects = useMemo(() => projectsQuery.data?.items ?? [], [projectsQuery.data]);

  const [projectId, setProjectId] = useState<string | undefined>(initialProjectId ?? undefined);
  const source = useRunSource(projectId);
  const health = usePlatformHealth();

  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setChecked(loadChecked());
  }, []);

  const appliedInitial = useRef(false);
  useEffect(() => {
    if (appliedInitial.current || !initialProjectId || projectsQuery.isLoading) {
      return;
    }
    appliedInitial.current = true;
    if (projects.some((project) => project.id === initialProjectId)) {
      setProjectId(initialProjectId);
    }
  }, [initialProjectId, projects, projectsQuery.isLoading]);

  const toggleCheck = (id: string) => {
    setChecked((current) => {
      const next = { ...current, [id]: !current[id] };
      try {
        localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable — state still works for the session.
      }
      return next;
    });
  };

  const checkedCount = Object.values(checked).filter(Boolean).length;
  const doneFraction = DEPLOYMENT_CHECKLIST.length
    ? Math.round((checkedCount / DEPLOYMENT_CHECKLIST.length) * 100)
    : 0;

  const devopsStep = stepForAgent(source.steps, "devops_engineer");
  const devopsMarkdown = devopsStep ? stepMarkdown(devopsStep) : "";

  const projectName = projects.find((project) => project.id === projectId)?.name ?? "Project";
  const composeName = `${projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-compose.yml`;

  const handleExportCompose = () => {
    downloadText(composeName, COMPOSE_TEMPLATE, "text/yaml;charset=utf-8");
  };

  const statusVariant =
    health.status === "ok" ? "success" : health.status === "partial" ? "warning" : "destructive";

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Deployment" },
        ]}
      />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Deployment Center</h1>
          <p className="text-sm text-muted-foreground">
            Operational overview: health, environment, build steps, and the compose topology.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <label
            htmlFor="deployment-project"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Project
          </label>
          <Select
            id="deployment-project"
            value={projectId ?? ""}
            onChange={(event) => setProjectId(event.target.value || undefined)}
          >
            <option value="">Select a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </div>
      </header>

      {/* Platform health */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-sm">
              <ShieldCheck className="mr-2 inline size-4 text-muted-foreground" aria-hidden="true" />
              Platform health
            </CardTitle>
            <CardDescription>
              Liveness and dependency probes — polled every 30 seconds.
            </CardDescription>
          </div>
          <Badge variant={statusVariant as "success"}>
            {health.status === "ok"
              ? "Healthy"
              : health.status === "partial"
                ? "Degraded"
                : "Unreachable"}
          </Badge>
        </CardHeader>
        <CardContent>
          {health.status === "unreachable" ? (
            <p className="text-sm text-muted-foreground">
              The API is not responding. Start the backend to run the health checks.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border border-border p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Service</p>
                <p className="mt-1 truncate text-sm font-medium">{health.service}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Version</p>
                <p className="mt-1 text-sm font-medium">{health.version}</p>
              </div>
              {health.components.length > 0 ? (
                health.components.map((component) => (
                  <div key={component.name} className="rounded-md border border-border p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {component.name}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-sm font-medium capitalize",
                        component.status === "ok"
                          ? "text-success"
                          : component.status === "skipped"
                            ? "text-muted-foreground"
                            : "text-destructive",
                      )}
                    >
                      {component.status}
                    </p>
                  </div>
                ))
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deployment plan artifact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            <Rocket className="mr-2 inline size-4 text-muted-foreground" aria-hidden="true" />
            Deployment plan
          </CardTitle>
          <CardDescription>
            Generated by the DevOps Engineer agent for the selected project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {source.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : source.error ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                The deployment plan could not be fetched.
              </p>
              <Button size="sm" variant="outline" onClick={source.refetch}>
                Retry
              </Button>
            </div>
          ) : devopsMarkdown ? (
            <div className="max-w-3xl">
              <Markdown content={devopsMarkdown} />
            </div>
          ) : (
            <div className="flex flex-col items-start gap-4 py-6 text-center">
              <div
                className="mx-auto flex size-12 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground"
                aria-hidden="true"
              >
                <FolderKanban className="size-5" />
              </div>
              <div className="mx-auto max-w-md space-y-1">
                <h3 className="text-base font-semibold tracking-tight">No deployment plan yet</h3>
                <p className="text-sm text-muted-foreground">
                  Run the agent pipeline for this project in the workspace to generate its
                  deployment plan.
                </p>
              </div>
              <Link href={projectId ? `/workspace/${projectId}` : "/workspace"} className="mx-auto">
                <Button size="sm" variant="outline">
                  Open workspace
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Environment variables */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              <KeyRound className="mr-2 inline size-4 text-muted-foreground" aria-hidden="true" />
              Environment variables
            </CardTitle>
            <CardDescription>Configured via the environment, never committed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {ENV_VARIABLES.map((variable) => (
              <div
                key={variable.name}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
              >
                <code className="font-mono text-xs text-primary">{variable.name}</code>
                <span className="truncate text-xs text-muted-foreground">
                  {variable.description}
                </span>
                {variable.secret ? (
                  <Badge variant="outline" className="shrink-0">
                    secret
                  </Badge>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Build commands */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              <TerminalSquare className="mr-2 inline size-4 text-muted-foreground" aria-hidden="true" />
              Build & run commands
            </CardTitle>
            <CardDescription>Sequence used to bring the stack up.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {BUILD_COMMANDS.map((command) => (
              <div key={command.command} className="rounded-md border border-border">
                <pre className="overflow-x-auto border-b border-border bg-muted/40 px-3 py-2 font-mono text-xs">
                  {command.command}
                </pre>
                <p className="px-3 py-1.5 text-xs text-muted-foreground">{command.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Deployment checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              <CheckCircle2 className="mr-2 inline size-4 text-muted-foreground" aria-hidden="true" />
              Deployment checklist
            </CardTitle>
            <CardDescription>
              {checkedCount}/{DEPLOYMENT_CHECKLIST.length} complete — {doneFraction}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div
                className="h-full rounded-full bg-success transition-all"
                style={{ width: `${doneFraction}%` }}
              />
            </div>
            <ul className="space-y-1">
              {DEPLOYMENT_CHECKLIST.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggleCheck(item.id)}
                    aria-pressed={Boolean(checked[item.id])}
                    className="flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {checked[item.id] ? (
                      <CheckCircle2
                        className="mt-0.5 size-4 shrink-0 text-success"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    )}
                    <span
                      className={cn(
                        checked[item.id] && "text-muted-foreground line-through",
                      )}
                    >
                      {item.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Docker compose export */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              <FileCode2 className="mr-2 inline size-4 text-muted-foreground" aria-hidden="true" />
              Docker Compose export
            </CardTitle>
            <CardDescription>
              The compose topology for the platform: web, API, database, and cache.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={handleExportCompose}>
                <Download aria-hidden="true" />
                Export compose file
              </Button>
              <span className="text-xs text-muted-foreground">
                Downloads <code className="font-mono">{composeName}</code>
              </span>
            </div>
            <div className="max-h-64 overflow-auto rounded-md border border-border bg-muted/40">
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <FileText className="size-3.5 text-muted-foreground" aria-hidden="true" />
                <span className="font-mono text-[11px] text-muted-foreground">
                  docker-compose.yml
                </span>
              </div>
              <pre className="p-3 font-mono text-[11px] leading-relaxed">
                {COMPOSE_TEMPLATE}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
