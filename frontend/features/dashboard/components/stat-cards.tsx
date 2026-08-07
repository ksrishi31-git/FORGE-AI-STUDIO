"use client";

import { Bot, CheckCircle2, FileCode2, FolderKanban, Rocket, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStats } from "@/services/dashboard";

interface StatItem {
  key: keyof DashboardStats;
  label: string;
  icon: LucideIcon;
}

const STAT_ITEMS: StatItem[] = [
  { key: "total_projects", label: "Total projects", icon: FolderKanban },
  { key: "active_agents", label: "Active agents", icon: Bot },
  { key: "tasks_completed", label: "Tasks completed", icon: CheckCircle2 },
  { key: "deployments", label: "Deployments", icon: Rocket },
  { key: "code_generated_files", label: "Files generated", icon: FileCode2 },
];

export interface StatCardsProps {
  stats: DashboardStats | undefined;
  isLoading: boolean;
  error: boolean;
}

/** KPI cards (FAD §7 — Dashboard statistics). */
export function StatCards({ stats, isLoading, error }: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {STAT_ITEMS.map((item) => (
        <Card key={item.key} className="transition-shadow hover:shadow-sm">
          <CardContent className="flex items-start justify-between gap-2 p-4">
            <div className="min-w-0 space-y-1">
              <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              {isLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <p className="text-2xl font-semibold tracking-tight">{stats?.[item.key] ?? 0}</p>
              )}
              <p className="truncate text-xs text-muted-foreground/70">
                {isLoading ? "Loading" : error ? "Unavailable" : "Live"}
              </p>
            </div>
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
              aria-hidden="true"
            >
              <item.icon className="size-4" />
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
