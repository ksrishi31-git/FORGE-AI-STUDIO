"use client";

import {
  Activity,
  Bot,
  FileText,
  FolderPlus,
  Network,
  Rocket,
  Server,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityEvent, ActivityType } from "@/services/dashboard";
import { EmptyState } from "./empty-state";
import { SectionError } from "./section-error";

const TYPE_ICON: Record<ActivityType, LucideIcon> = {
  project_created: FolderPlus,
  architecture_generated: Network,
  backend_completed: Server,
  deployment_started: Rocket,
  documentation_generated: FileText,
  agent_status: Bot,
  other: Activity,
};

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export interface ActivityTimelineProps {
  events: ActivityEvent[];
  isLoading: boolean;
  error: boolean;
  onRetry: () => void;
}

export function ActivityTimeline({ events, isLoading, error, onRetry }: ActivityTimelineProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <SectionError onRetry={onRetry} />
        ) : events.length === 0 ? (
          <EmptyState
            icon={<Activity className="size-4" />}
            title="No activity yet"
            description="Pipeline events will appear here as agents plan, build, test, and deploy."
          />
        ) : (
          <ol className="relative ml-2 space-y-5 border-l border-border pl-5">
            {events.map((event) => {
              const Icon = TYPE_ICON[event.type];
              return (
                <li key={event.id} className="relative">
                  <span
                    className="absolute -left-[27px] flex size-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"
                    aria-hidden="true"
                  >
                    <Icon className="size-3" />
                  </span>
                  <p className="text-sm leading-snug">{event.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {timeAgo(event.created_at)}
                    {event.project ? ` · ${event.project}` : ""}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
