"use client";

import Link from "next/link";
import { ArrowRight, Bot } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgentStatus, AgentSummary } from "@/services/dashboard";
import { EmptyState } from "./empty-state";
import { SectionError } from "./section-error";

const STATUS_VARIANT: Record<AgentStatus, "muted" | "info" | "warning" | "destructive"> = {
  idle: "muted",
  working: "info",
  reviewing: "warning",
  blocked: "warning",
  error: "destructive",
};

export interface ActiveAgentsProps {
  agents: AgentSummary[];
  isLoading: boolean;
  error: boolean;
  onRetry: () => void;
}

export function ActiveAgents({ agents, isLoading, error, onRetry }: ActiveAgentsProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Active agents</CardTitle>
        <Link
          href="/agents"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View all
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
        ) : error ? (
          <SectionError onRetry={onRetry} />
        ) : agents.length === 0 ? (
          <EmptyState
            icon={<Bot className="size-4" />}
            title="No agents are running"
            description="Agents activate when a project run begins. Their status, tasks, and health will appear here."
            action={
              <Link href="/agents">
                <Button variant="outline" size="sm">
                  View agent workspace
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="rounded-lg border border-border bg-background/50 p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{agent.name}</p>
                  <Badge variant={STATUS_VARIANT[agent.status]}>{agent.status}</Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {agent.current_task ?? "Waiting for assignment"}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                      Health
                    </p>
                    <Progress value={agent.health} indicatorClassName="bg-success" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                      Progress
                    </p>
                    <Progress value={agent.progress} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
