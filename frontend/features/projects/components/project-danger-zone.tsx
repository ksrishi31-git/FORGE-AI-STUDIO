"use client";

import { Archive, ArchiveRestore, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import type { Project } from "@/services/projects";
import { ApiError } from "@/services/http-client";
import { useArchiveProject, useDeleteProject, useRestoreProject } from "../hooks/use-projects";

export function ProjectDangerZone({ project }: { project: Project }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const archive = useArchiveProject(project.id);
  const restore = useRestoreProject(project.id);
  const remove = useDeleteProject(project.id);

  const busy = archive.isPending || restore.isPending || remove.isPending;
  const error = [archive, restore, remove].find((mutation) => mutation.isError);

  const message = error
    ? error.error instanceof ApiError
      ? error.error.message
      : "The operation could not be completed."
    : null;

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-destructive">Danger zone</CardTitle>
        <CardDescription>
          Archive the project to remove it from active views, or permanently remove it from your
          workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message ? <Alert variant="destructive">{message}</Alert> : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/40 p-4">
          <div>
            <p className="text-sm font-medium">
              {project.archived ? "Restore project" : "Archive project"}
            </p>
            <p className="text-xs text-muted-foreground">
              {project.archived
                ? "Return the project to your active workspace."
                : "Hide the project from active views. You can restore it later."}
            </p>
          </div>
          {project.archived ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void restore.mutateAsync()}
            >
              {restore.isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <ArchiveRestore aria-hidden="true" />
              )}
              Restore
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void archive.mutateAsync()}
            >
              {archive.isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Archive aria-hidden="true" />
              )}
              Archive
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
          <div>
            <p className="text-sm font-medium text-destructive">Delete project</p>
            <p className="text-xs text-muted-foreground">
              Soft-deletes the project. It will no longer appear anywhere in the workspace.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 aria-hidden="true" />
            Delete project
          </Button>
        </div>
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen} titleId="delete-project-title">
        <h2 id="delete-project-title" className="text-lg font-semibold tracking-tight">
          Delete {project.name}?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          This action soft-deletes the project. Its artifacts and history are retained internally
          but it will no longer be accessible from the workspace. This cannot be undone from the UI.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={remove.isPending}
            onClick={() => void remove.mutateAsync()}
          >
            {remove.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Delete project
          </Button>
        </div>
      </Dialog>
    </Card>
  );
}
