"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/providers/session-provider";
import { toQuery, type ProjectListParams } from "@/services/projects";
import { useProjects } from "../hooks/use-projects";
import { ProjectCard } from "./project-card";
import { ProjectFilters } from "./project-filters";
import { ProjectPagination } from "./project-pagination";
import { ProjectSearch } from "./project-search";
import { ProjectsEmptyState } from "./projects-empty-state";
import { ProjectsErrorState } from "./projects-error-state";

const DEFAULT_PAGE_SIZE = 9;

export function ProjectsListPage({ initialParams }: { initialParams: ProjectListParams }) {
  const router = useRouter();
  const { user } = useSession();
  const canManage = user?.role === "admin" || user?.role === "developer";

  const [params, setParams] = useState<ProjectListParams>({
    page_size: DEFAULT_PAGE_SIZE,
    ...initialParams,
  });
  const [searchInput, setSearchInput] = useState(initialParams.q ?? "");
  const [debouncedQ, setDebouncedQ] = useState(initialParams.q ?? "");

  // Keep state in sync with URL-driven props (back/forward, external links).
  useEffect(() => {
    setParams((current) => ({ ...current, ...initialParams }));
    setSearchInput(initialParams.q ?? "");
    setDebouncedQ(initialParams.q ?? "");
    // Only re-sync when the committed query actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialParams.q,
    initialParams.status,
    initialParams.priority,
    initialParams.visibility,
    initialParams.archived,
    initialParams.page,
  ]);

  const commit = useCallback(
    (next: ProjectListParams) => {
      setParams(next);
      router.replace(`/projects${toQuery({ ...next, page_size: DEFAULT_PAGE_SIZE })}`, {
        scroll: false,
      });
    },
    [router],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedQ !== params.q) {
        commit({ ...params, q: debouncedQ || undefined, page: 1 });
      }
    }, 400);
    return () => clearTimeout(timer);
    // Re-run only when the debounced query changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  const handleFilterChange = (patch: Partial<ProjectListParams>) => {
    commit({ ...params, ...patch, page: 1 });
  };

  const handleReset = () => {
    setSearchInput("");
    setDebouncedQ("");
    commit({ page_size: DEFAULT_PAGE_SIZE });
  };

  const query = useProjects(params);
  const isLoading = query.isLoading;
  const isError = query.isError;
  const data = query.data;
  const hasActiveFilters =
    params.q !== undefined ||
    params.status !== undefined ||
    params.priority !== undefined ||
    params.visibility !== undefined ||
    params.archived !== undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Projects" }]}
        title="Projects"
        description="Create and manage software projects, each driven by the autonomous agent pipeline."
        actions={
          canManage ? (
            <Link href="/projects/new">
              <Button size="sm">
                <Plus aria-hidden="true" />
                New project
              </Button>
            </Link>
          ) : null
        }
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ProjectSearch initialValue={searchInput} onCommit={setDebouncedQ} />
        </div>
        <ProjectFilters params={params} onChange={handleFilterChange} onReset={handleReset} />
      </div>

      {isError ? (
        <ProjectsErrorState onRetry={() => query.refetch()} />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-44 w-full" />
          ))}
        </div>
      ) : data && data.total > 0 && data.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card/50 px-6 py-14 text-center">
          <p className="text-sm font-medium">This page is empty</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Projects exist, but none are on page {data.page} of{" "}
            {Math.ceil(data.total / data.page_size)}.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => commit({ ...params, page: Math.ceil(data.total / data.page_size) })}
          >
            Go to last page
          </Button>
        </div>
      ) : data && data.total === 0 ? (
        <ProjectsEmptyState filtered={hasActiveFilters} canManage={canManage} />
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
          <ProjectPagination
            page={data.page}
            pageSize={data.page_size}
            total={data.total}
            onPageChange={(page) => commit({ ...params, page })}
          />
        </>
      ) : null}
    </div>
  );
}
