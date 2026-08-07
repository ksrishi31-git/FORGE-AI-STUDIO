import { FolderKanban, SearchX } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export interface ProjectsEmptyStateProps {
  filtered: boolean;
  canManage: boolean;
}

export function ProjectsEmptyState({ filtered, canManage }: ProjectsEmptyStateProps) {
  if (filtered) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <div
          className="flex size-12 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground"
          aria-hidden="true"
        >
          <SearchX className="size-5" />
        </div>
        <h3 className="mt-4 text-sm font-semibold tracking-tight">No matching projects</h3>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          No projects match the current search or filters. Adjust or clear them to see more results.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <div
        className="flex size-12 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground"
        aria-hidden="true"
      >
        <FolderKanban className="size-5" />
      </div>
      <h3 className="mt-4 text-sm font-semibold tracking-tight">No projects yet</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {canManage
          ? "Create your first project to start the autonomous software engineering pipeline."
          : "Projects created by your team will appear here once the first pipeline is started."}
      </p>
      {canManage ? (
        <Link href="/projects/new" className="mt-5">
          <Button size="sm">
            <FolderKanban aria-hidden="true" />
            Create project
          </Button>
        </Link>
      ) : null}
    </div>
  );
}
