"use client";

import type { CSSProperties, ReactNode } from "react";
import { BarChart3, LineChart as LineChartIcon, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw } from "lucide-react";
import type {
  AgentActivityPoint,
  DeploymentHistoryPoint,
  WeeklyProjectsPoint,
} from "@/services/dashboard";
import type { DashboardOverview } from "../use-dashboard";

const PRIMARY = "#6366f1";
const DANGER = "#ef4444";
const NEUTRAL = "#6b7280";
const GRID = "#e4e4e7";

const TOOLTIP_STYLE: CSSProperties = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--card)",
  fontSize: 12,
  color: "var(--foreground)",
};

function ChartEmpty({ icon }: { icon: ReactNode }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30">
      <span className="flex size-10 items-center justify-center rounded-lg bg-card text-muted-foreground shadow-sm">
        {icon}
      </span>
      <div className="text-center">
        <p className="text-sm font-medium">No data to chart yet</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Charts populate once the telemetry endpoints return data.
        </p>
      </div>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  isLoading: boolean;
  hasData: boolean;
  error: boolean;
  onRetry: () => void;
  children: ReactNode;
}

function ChartCard({
  title,
  description,
  icon,
  isLoading,
  hasData,
  error,
  onRetry,
  children,
}: ChartCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : error ? (
          <ChartEmptyError onRetry={onRetry} />
        ) : hasData ? (
          <div className="h-48 w-full">{children}</div>
        ) : (
          <ChartEmpty icon={icon} />
        )}
      </CardContent>
    </Card>
  );
}

function ChartEmptyError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-destructive/40 bg-destructive/5">
      <AlertCircle className="size-5 text-destructive" aria-hidden="true" />
      <div className="text-center">
        <p className="text-sm font-medium">Could not load chart data</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          The telemetry endpoints could not be reached.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw aria-hidden="true" />
        Retry
      </Button>
    </div>
  );
}

function ProjectsPerWeekChart({ data }: { data: WeeklyProjectsPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis
          dataKey="week"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: NEUTRAL }}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: NEUTRAL }}
        />
        <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="projects" name="Projects" fill={PRIMARY} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function AgentActivityChart({ data }: { data: AgentActivityPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="agentActivityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.28} />
            <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: NEUTRAL }}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: NEUTRAL }}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Area
          type="monotone"
          dataKey="executions"
          name="Agent executions"
          stroke={PRIMARY}
          strokeWidth={2}
          fill="url(#agentActivityFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function DeploymentHistoryChart({ data }: { data: DeploymentHistoryPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: NEUTRAL }}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: NEUTRAL }}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Line
          type="monotone"
          dataKey="builds"
          name="Deployments"
          stroke={PRIMARY}
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="failures"
          name="Failures"
          stroke={DANGER}
          strokeWidth={2}
          dot={false}
          strokeDasharray="4 4"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export interface ChartsSectionProps {
  data: DashboardOverview | undefined;
  isLoading: boolean;
  error: boolean;
  onRetry: () => void;
}

export function ChartsSection({ data, isLoading, error, onRetry }: ChartsSectionProps) {
  return (
    <section aria-label="Charts" className="grid gap-3 lg:grid-cols-3">
      <ChartCard
        title="Projects per week"
        description="Projects created across the platform."
        icon={<BarChart3 className="size-4 text-muted-foreground" aria-hidden="true" />}
        isLoading={isLoading}
        hasData={(data?.projectsPerWeek.length ?? 0) > 0}
        error={error}
        onRetry={onRetry}
      >
        <ProjectsPerWeekChart data={data?.projectsPerWeek ?? []} />
      </ChartCard>

      <ChartCard
        title="Agent activity"
        description="Agent executions over time."
        icon={<TrendingUp className="size-4 text-muted-foreground" aria-hidden="true" />}
        isLoading={isLoading}
        hasData={(data?.agentActivity.length ?? 0) > 0}
        error={error}
        onRetry={onRetry}
      >
        <AgentActivityChart data={data?.agentActivity ?? []} />
      </ChartCard>

      <ChartCard
        title="Deployment history"
        description="Builds and failures across environments."
        icon={<LineChartIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
        isLoading={isLoading}
        hasData={(data?.deployments.length ?? 0) > 0}
        error={error}
        onRetry={onRetry}
      >
        <DeploymentHistoryChart data={data?.deployments ?? []} />
      </ChartCard>
    </section>
  );
}
