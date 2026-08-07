"use client";

import { ChevronLeft, ChevronRight, History, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDate } from "@/features/projects/lib/format";
import type { RunHistoryItem } from "@/services/agents";
import { useAgentHistory, useDeleteRun } from "../hooks/use-agents";
import { ModeBadge, RunStatusBadge } from "./status-badges";

export interface HistoryListProps {
  selectedRunId: string | null;
  onSelect: (runId: string) => void;
}

export function HistoryList({ selectedRunId, onSelect }: HistoryListProps) {
  const [page, setPage] = useState(1);
  const history = useAgentHistory(page);
  const deleteRun = useDeleteRun();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" aria-hidden="true" />
          Run history
        </CardTitle>
        <CardDescription>Previous pipeline executions for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        {history.isLoading ? (
          <div className="space-y-2" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : history.isError ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Unable to load run history.
          </p>
        ) : history.data && history.data.total === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <History className="size-5 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">No runs yet</p>
            <p className="text-xs text-muted-foreground">
              Start the pipeline to see executions here.
            </p>
          </div>
        ) : history.data ? (
          <>
            <ul className="space-y-2">
              {history.data.items.map((item: RunHistoryItem) => {
                const selected = item.id === selectedRunId;
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "group rounded-md border p-3 transition-colors",
                      selected
                        ? "border-primary/40 bg-accent/60"
                        : "border-border hover:bg-accent/40",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onSelect(item.id)}
                        aria-pressed={selected}
                        className="min-w-0 flex-1 text-left focus-visible:outline-none"
                      >
                        <p className="truncate text-sm font-medium">
                          {item.requirements?.slice(0, 60) || "Untitled run"}
                        </p>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <RunStatusBadge status={item.status} />
                          <ModeBadge mode={item.mode} />
                          <span>{formatDate(item.created_at)}</span>
                        </p>
                      </button>
                      <button
                        type="button"
                        aria-label="Delete run"
                        onClick={() => void deleteRun.mutateAsync(item.id)}
                        className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                    <Progress value={item.progress} className="mt-2 h-1" />
                  </li>
                );
              })}
            </ul>

            {history.data.total > history.data.page_size ? (
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft aria-hidden="true" />
                  Previous
                </Button>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {history.data.page} /{" "}
                  {Math.max(1, Math.ceil(history.data.total / history.data.page_size))}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= Math.ceil(history.data.total / history.data.page_size)}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                  <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
